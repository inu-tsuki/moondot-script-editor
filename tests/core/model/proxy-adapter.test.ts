// ---------------------------------------------------------------------------
// Proxy model adapter unit tests — mocked globalThis.fetch
// ---------------------------------------------------------------------------

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProxyModelAdapter, PROXY_PROVIDER_CONFIG } from '../../../src/core/model';
import type { ModelCallResult, ModelCallRequest } from '../../../src/core/model';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const architectRequest: ModelCallRequest<'adaptation_planning'> = {
  messages: [{ role: 'user', content: 'Generate an adaptation plan.' }],
  stage: 'adaptation_planning',
  runId: 'run-arch-001',
  structuredOutput: { schemaId: 'adaptation_plan_v1' },
};

const writerRequest: ModelCallRequest<'scene_draft'> = {
  messages: [{ role: 'user', content: 'Write a scene draft.' }],
  stage: 'scene_draft',
  runId: 'run-writer-001',
  structuredOutput: { schemaId: 'writer_scene_patch_v1' },
};

const validArchitectResult: ModelCallResult = {
  data: {
    id: 'plan-test',
    preferences: {},
    sourceAnalysis: {
      coreEvents: [],
      characterArcs: [],
      timeline: [],
      mustKeeps: [],
      compressibleParts: [],
      exteriorizationNotes: [],
    },
    adaptationQuestions: [],
    questionAnswers: [],
    adaptationOptions: [],
    recommendedPlan: 'Test plan.',
    sceneOutline: [],
    characterUpdates: [],
    risks: [],
  },
  diagnostics: [],
  trace: {
    provider: 'local_proxy',
    stage: 'adaptation_planning',
    outcome: 'success',
    durationMs: 123,
  },
  runId: 'run-arch-001',
};

const validWriterResult: ModelCallResult = {
  data: {
    planId: 'plan-test',
    scenes: [
      {
        sceneCardId: 'sc1',
        title: 'Opening',
        synopsis: 'An opening.',
        heading: { locationType: 'INT', location: 'Room', timeOfDay: 'DAY' },
        sourceRefs: [{ kind: 'chapter', sourceId: 'ch1' }],
        blocks: [],
      },
    ],
  },
  diagnostics: [],
  trace: {
    provider: 'local_proxy',
    stage: 'scene_draft',
    outcome: 'success',
    durationMs: 456,
  },
  runId: 'run-writer-001',
};

const serverErrorResult = (reason: string, message: string): Record<string, unknown> => ({
  data: null,
  diagnostics: [
    {
      severity: 'error',
      code: `model_${reason}`,
      message,
      path: 'model',
    },
  ],
  trace: {
    provider: 'local_proxy',
    stage: 'adaptation_planning',
    outcome: 'error',
    fallbackReason: reason,
  },
  error: { reason, message },
  runId: 'run-arch-001',
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const textResponse = (body: unknown, contentType = 'application/json', status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': contentType },
  });

const htmlResponse = (status = 500): Response =>
  new Response(
    '<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Server Error</h1></body></html>',
    { status, headers: { 'Content-Type': 'text/html' } },
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProxyModelAdapter', () => {
  it('exposes local_proxy config', () => {
    const adapter = createProxyModelAdapter();
    expect(adapter.config).toEqual(PROXY_PROVIDER_CONFIG);
    expect(adapter.config.provider).toBe('local_proxy');
  });

  // -----------------------------------------------------------------------
  // Success paths
  // -----------------------------------------------------------------------

  describe('success', () => {
    it('returns ModelCallResult with Architect data on valid server response', async () => {
      mockFetch.mockResolvedValueOnce(textResponse(validArchitectResult));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).not.toBeNull();
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('sceneOutline');
      expect(result.error).toBeUndefined();
      expect(result.trace.outcome).toBe('success');
      expect(result.trace.provider).toBe('local_proxy');
      expect(result.runId).toBe('run-arch-001');
    });

    it('returns ModelCallResult with Writer data on valid server response', async () => {
      mockFetch.mockResolvedValueOnce(textResponse(validWriterResult));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(writerRequest);

      expect(result.data).not.toBeNull();
      expect(result.data).toHaveProperty('planId');
      expect(result.data).toHaveProperty('scenes');
      expect(result.error).toBeUndefined();
      expect(result.trace.outcome).toBe('success');
      expect(result.trace.provider).toBe('local_proxy');
      expect(result.runId).toBe('run-writer-001');
    });
  });

  // -----------------------------------------------------------------------
  // Fetch network errors (never reached server)
  // -----------------------------------------------------------------------

  describe('network — fetch rejection', () => {
    it('returns network error on TypeError (connection refused)', async () => {
      const connErr = new TypeError('fetch failed');
      mockFetch.mockRejectedValueOnce(connErr);

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.reason).toBe('network');
      expect(result.error!.message.toLowerCase()).toContain('network');
      expect(result.trace.outcome).toBe('error');
      // Must not throw — always resolves
    });

    it('returns network error on AbortError (timeout)', async () => {
      const abortErr = new Error('The operation was aborted.');
      abortErr.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortErr);

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.reason).toBe('network');
      expect(result.error!.message.toLowerCase()).toContain('timed out');
      expect(result.trace.outcome).toBe('error');
    });

    it('returns network error on generic fetch rejection', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Some unknown fetch error'));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.reason).toBe('network');
      expect(result.trace.outcome).toBe('error');
    });
  });

  // -----------------------------------------------------------------------
  // Server error responses (reached server, got error back)
  // -----------------------------------------------------------------------

  describe('server error responses', () => {
    it('passes through config_missing from server', async () => {
      const errResult = serverErrorResult('config_missing', 'OPENAI_API_KEY is not set.');
      mockFetch.mockResolvedValueOnce(textResponse(errResult));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.reason).toBe('config_missing');
      expect(result.error!.message).toContain('OPENAI_API_KEY');
    });

    it('passes through refusal from server', async () => {
      const errResult = serverErrorResult(
        'refusal',
        'Model refused to generate output. Reason: content_filter.',
      );
      mockFetch.mockResolvedValueOnce(textResponse(errResult));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.reason).toBe('refusal');
      expect(result.error!.message).toContain('content_filter');
    });

    it('passes through empty_output from server', async () => {
      const errResult = serverErrorResult('empty_output', 'Model returned no output text.');
      mockFetch.mockResolvedValueOnce(textResponse(errResult));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.reason).toBe('empty_output');
    });

    it('passes through schema from server', async () => {
      const errResult = serverErrorResult(
        'schema',
        'App-side schema validation failed at preferences.targetMedium: Required.',
      );
      mockFetch.mockResolvedValueOnce(textResponse(errResult));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.reason).toBe('schema');
    });
  });

  // -----------------------------------------------------------------------
  // Malformed HTTP responses
  // -----------------------------------------------------------------------

  describe('malformed HTTP responses', () => {
    it('returns network error on non-JSON response body', async () => {
      mockFetch.mockResolvedValueOnce(htmlResponse(500));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.reason).toBe('network');
      expect(result.error!.message).toContain('non-JSON');
    });

    it('returns network error on HTTP 200 with non-JSON body', async () => {
      // Edge case: server returns 200 but body is HTML (e.g. SPA index.html fallback in prod)
      mockFetch.mockResolvedValueOnce(htmlResponse(200));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.reason).toBe('network');
    });

    it('returns parse error on JSON response without ModelCallResult shape', async () => {
      // Server returned valid JSON but not in ModelCallResult shape
      mockFetch.mockResolvedValueOnce(textResponse({ foo: 'bar' }));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call(architectRequest);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.reason).toBe('parse');
      expect(result.error!.message).toContain('unexpected JSON structure');
    });
  });

  // -----------------------------------------------------------------------
  // runId echo
  // -----------------------------------------------------------------------

  describe('runId', () => {
    it('echoes runId from server response when present', async () => {
      const resultWithCustomRunId = { ...validArchitectResult, runId: 'my-custom-run' };
      mockFetch.mockResolvedValueOnce(textResponse(resultWithCustomRunId));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call({ ...architectRequest, runId: 'my-custom-run' });

      expect(result.runId).toBe('my-custom-run');
    });

    it('preserves server error runId', async () => {
      const errResult = {
        ...serverErrorResult('config_missing', 'No API key.'),
        runId: 'my-error-run',
      };
      mockFetch.mockResolvedValueOnce(textResponse(errResult));

      const adapter = createProxyModelAdapter();
      const result = await adapter.call({ ...architectRequest, runId: 'my-error-run' });

      expect(result.runId).toBe('my-error-run');
    });
  });

  // -----------------------------------------------------------------------
  // POST body verification
  // -----------------------------------------------------------------------

  describe('request serialization', () => {
    it('sends POST to /api/model/call with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(textResponse(validArchitectResult));

      const adapter = createProxyModelAdapter();
      await adapter.call(architectRequest);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/model/call');
      expect(init!.method).toBe('POST');
      expect((init!.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect(init!.body).toBeDefined();

      // Body should be valid JSON matching the request
      const parsed = JSON.parse(init!.body as string);
      expect(parsed.stage).toBe('adaptation_planning');
      expect(parsed.runId).toBe('run-arch-001');
      expect(parsed.messages).toEqual(architectRequest.messages);
      expect(parsed.structuredOutput).toEqual(architectRequest.structuredOutput);
    });

    it('uses custom baseUrl when provided', async () => {
      mockFetch.mockResolvedValueOnce(textResponse(validArchitectResult));

      const adapter = createProxyModelAdapter('http://127.0.0.1:5173');
      await adapter.call(architectRequest);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('http://127.0.0.1:5173/api/model/call');
    });
  });
});
