// ---------------------------------------------------------------------------
// Handler unit tests — mocked OpenAI SDK
// ---------------------------------------------------------------------------

import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APIConnectionError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from 'openai';

// ---------------------------------------------------------------------------
// Shared mock state
// ---------------------------------------------------------------------------

let mockApiKey: string | undefined = 'sk-test-key';
let mockModel = 'gpt-4.1-mini';
const fakeCreate = vi.fn();

vi.mock('../../src/server/openai-client', () => ({
  createOpenAIClient: vi.fn(() => ({
    responses: { create: fakeCreate },
  })),
}));

vi.mock('../../src/server/env', () => ({
  readServerEnv: vi.fn(() => ({
    openaiApiKey: mockApiKey,
    openaiModel: mockModel,
    openaiBaseUrl: undefined,
  })),
  canMakeRealCall: vi.fn(() => Boolean(mockApiKey && mockApiKey.length > 0)),
}));

// Handler must be imported AFTER mocks
import { handleModelCall } from '../../src/server/handler';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Create a fake IncomingMessage from a JSON body. */
const createFakeReq = (method: string, body: unknown): IncomingMessage => {
  const bodyStr = JSON.stringify(body);
  const stream = Readable.from([Buffer.from(bodyStr)]);
  return Object.assign(stream, { method }) as unknown as IncomingMessage;
};

/** Create a fake ServerResponse that captures status, headers, and body. */
const createFakeRes = () => {
  let body = '';
  const headers: Record<string, string> = {};
  return {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    end(chunk?: string) {
      if (chunk) body = chunk;
    },
    get body() {
      return body;
    },
    get jsonBody(): unknown {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    },
    getHeader(name: string) {
      return headers[name];
    },
  } as unknown as ServerResponse & {
    body: string;
    jsonBody: unknown;
    getHeader(name: string): string | undefined;
  };
};

const createFakeGetReq = () => createFakeReq('GET', {});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validArchitectPlan = {
  id: 'plan-test',
  preferences: {
    targetMedium: 'screenplay',
    targetLength: 'short_scene',
    fidelity: 'faithful',
    pacing: 'balanced',
    style: 'realist',
    allowCharacterMerge: false,
    allowSubplotCompression: false,
    allowTimelineReorder: false,
    source: 'system_default',
  },
  sourceAnalysis: {
    coreEvents: ['event1'],
    characterArcs: ['arc1'],
    timeline: ['t1'],
    mustKeeps: ['m1'],
    compressibleParts: ['c1'],
    exteriorizationNotes: ['x1'],
  },
  adaptationQuestions: [
    {
      id: 'q1',
      question: 'Should we merge characters?',
      whyItMatters: 'Affects cast size.',
      sourceRefs: [{ kind: 'chapter' as const, sourceId: 'ch1' }],
      options: [{ id: 'o1', label: 'Yes', impact: 'Fewer actors.' }],
      recommendedOptionId: 'o1',
    },
  ],
  questionAnswers: [{ questionId: 'q1', optionId: 'o1', source: 'recommended' as const }],
  adaptationOptions: [{ id: 'a1', title: 'Merge B and C', tradeoffs: 'Loses B subplot.' }],
  recommendedPlan: 'Merge characters B and C.',
  sceneOutline: [
    {
      id: 'sc1',
      title: 'Opening',
      dramaticPurpose: 'Establish setting.',
      sourceRefs: [{ kind: 'chapter' as const, sourceId: 'ch1' }],
      pacing: 'balanced' as const,
      estimatedBlocks: 5,
      writerBrief: 'Write the opening scene.',
      headingSuggestion: { locationType: 'INT' as const, location: 'Room', timeOfDay: 'DAY' },
    },
  ],
  characterUpdates: ['char1'],
  risks: ['Pacing may be slow.'],
};

const validWriterProviderOutput = {
  planId: 'plan-test',
  characterUpdates: null,
  scenes: [
    {
      sceneCardId: 'sc1',
      title: 'Opening',
      synopsis: 'A character enters the room.',
      heading: { locationType: 'INT' as const, location: 'Room', timeOfDay: 'DAY' },
      sourceRefs: [{ kind: 'chapter' as const, sourceId: 'ch1' }],
      blocks: [
        {
          type: 'action' as const,
          text: 'A figure steps through the door.',
          sourceRefs: null,
          characterId: null,
          parenthetical: null,
          voice: null,
        },
      ],
    },
  ],
};

const architectRequest = {
  messages: [{ role: 'user' as const, content: 'Generate an adaptation plan.' }],
  stage: 'adaptation_planning',
  runId: 'run-001',
  structuredOutput: { schemaId: 'adaptation_plan_v1' },
};

const writerRequest = {
  messages: [{ role: 'user' as const, content: 'Write a scene draft.' }],
  stage: 'scene_draft',
  runId: 'run-002',
  structuredOutput: { schemaId: 'writer_scene_patch_v1' },
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockApiKey = 'sk-test-key';
  mockModel = 'gpt-4.1-mini';
  fakeCreate.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Success paths
// ---------------------------------------------------------------------------

describe('handleModelCall — success', () => {
  it('Architect: returns ModelCallResult with data on valid output', async () => {
    fakeCreate.mockResolvedValueOnce({
      output_text: JSON.stringify(validArchitectPlan),
      error: null,
      incomplete_details: null,
    });

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.getHeader('Content-Type')).toBe('application/json');

    const result = res.jsonBody as Record<string, unknown>;
    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.trace).toBeDefined();
    expect((result.trace as Record<string, unknown>).outcome).toBe('success');
    expect((result.trace as Record<string, unknown>).provider).toBe('local_proxy');
    expect(result.runId).toBe('run-001');

    // Verify data shape
    const data = result.data as Record<string, unknown>;
    expect(data.id).toBe('plan-test');
    expect(data.sceneOutline).toBeDefined();
  });

  it('Writer: returns ModelCallResult with data on valid output', async () => {
    fakeCreate.mockResolvedValueOnce({
      output_text: JSON.stringify(validWriterProviderOutput),
      error: null,
      incomplete_details: null,
    });

    const req = createFakeReq('POST', writerRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    expect(res.statusCode).toBe(200);
    const result = res.jsonBody as Record<string, unknown>;
    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
    expect((result.trace as Record<string, unknown>).outcome).toBe('success');

    // Verify normalized data has app-side shape
    const data = result.data as Record<string, unknown>;
    expect(data.planId).toBe('plan-test');
    expect(Array.isArray(data.scenes)).toBe(true);
    // characterUpdates was null → omitted
    expect(data.characterUpdates).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Config missing
// ---------------------------------------------------------------------------

describe('handleModelCall — config_missing', () => {
  it('no API key', async () => {
    mockApiKey = '';

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    expect(res.statusCode).toBe(200);
    const result = res.jsonBody as Record<string, unknown>;
    expect(result.data).toBeNull();
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('config_missing');
    expect((result.trace as Record<string, unknown>).outcome).toBe('error');
  });

  it('unknown stage', async () => {
    const req = createFakeReq('POST', {
      messages: [{ role: 'user', content: 'test' }],
      stage: 'nonexistent_stage',
      structuredOutput: { schemaId: 'adaptation_plan_v1' },
    });
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('config_missing');
    expect((error.message as string).toLowerCase()).toContain('unknown');

    // Must NOT call OpenAI for unknown stage
    expect(fakeCreate).not.toHaveBeenCalled();
  });

  it('stage / schemaId mismatch', async () => {
    const req = createFakeReq('POST', {
      messages: [{ role: 'user', content: 'Write a scene draft.' }],
      stage: 'scene_draft',
      structuredOutput: { schemaId: 'adaptation_plan_v1' }, // wrong schema for this stage
    });
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('config_missing');
    expect((error.message as string).toLowerCase()).toContain('expects');

    // Must NOT call OpenAI on stage/schema mismatch
    expect(fakeCreate).not.toHaveBeenCalled();
  });

  it('schemaId not in provider registry (safety net)', async () => {
    // Valid stage but schemaId isn't registered in PROVIDER_SCHEMA_REGISTRY
    const req = createFakeReq('POST', {
      messages: [{ role: 'user', content: 'test' }],
      stage: 'adaptation_planning',
      structuredOutput: { schemaId: 'unregistered_schema_v99' },
    });
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    // Stage passes step 5, but fails step 7 (provider registry lookup)
    expect(error.reason).toBe('config_missing');
  });

  it('GET method', async () => {
    const req = createFakeGetReq();
    const res = createFakeRes();

    await handleModelCall(req, res);

    expect(res.statusCode).toBe(405);
    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('config_missing');
  });
});

// ---------------------------------------------------------------------------
// Parse errors
// ---------------------------------------------------------------------------

describe('handleModelCall — parse', () => {
  it('body is not JSON', async () => {
    const bodyStr = 'not json';
    const stream = Readable.from([Buffer.from(bodyStr)]);
    const req = Object.assign(stream, { method: 'POST' }) as unknown as IncomingMessage;
    const res = createFakeRes();

    await handleModelCall(req, res);

    expect(res.statusCode).toBe(400);
    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('parse');
  });

  it('body missing messages field', async () => {
    const req = createFakeReq('POST', { stage: 'adaptation_planning' });
    const res = createFakeRes();

    await handleModelCall(req, res);

    expect(res.statusCode).toBe(400);
    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('parse');
  });

  it('body missing structuredOutput.schemaId', async () => {
    const req = createFakeReq('POST', {
      messages: [{ role: 'user', content: 'test' }],
      stage: 'adaptation_planning',
      structuredOutput: {},
    });
    const res = createFakeRes();

    await handleModelCall(req, res);

    expect(res.statusCode).toBe(400);
    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('parse');
  });
});

// ---------------------------------------------------------------------------
// Network errors
// ---------------------------------------------------------------------------

describe('handleModelCall — network', () => {
  it('APIConnectionError', async () => {
    fakeCreate.mockRejectedValueOnce(new APIConnectionError({ message: 'Connection refused.' }));

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('network');
    expect((error.message as string).toLowerCase()).toContain('connection');
  });

  it('RateLimitError (429)', async () => {
    fakeCreate.mockRejectedValueOnce(
      new RateLimitError(429, { code: 'rate_limit_exceeded' }, 'Too many requests.', undefined),
    );

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('network');
    expect((error.message as string).toLowerCase()).toContain('rate');
  });

  it('InternalServerError (5xx)', async () => {
    fakeCreate.mockRejectedValueOnce(
      new InternalServerError(500, { code: 'server_error' }, 'Server error.', undefined),
    );

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('network');
  });

  it('AuthenticationError → config_missing', async () => {
    // Bad API key is a config issue, not network
    fakeCreate.mockRejectedValueOnce(
      new AuthenticationError(401, { code: 'invalid_api_key' }, 'Invalid API key.', undefined),
    );

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('config_missing');
  });
});

// ---------------------------------------------------------------------------
// Refusal / empty output
// ---------------------------------------------------------------------------

describe('handleModelCall — refusal / empty', () => {
  it('content_filter refusal', async () => {
    fakeCreate.mockResolvedValueOnce({
      output_text: '',
      error: null,
      incomplete_details: { reason: 'content_filter' },
    });

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('refusal');
    expect((error.message as string).toLowerCase()).toContain('content_filter');
  });

  it('refusal via output content part', async () => {
    // Responses API can express refusal as a content part in output messages
    fakeCreate.mockResolvedValueOnce({
      output_text: '',
      error: null,
      incomplete_details: null,
      output: [
        {
          type: 'message',
          content: [{ type: 'refusal', refusal: 'I cannot generate that content.' }],
        },
      ],
    });

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('refusal');
    expect((error.message as string).toLowerCase()).toContain('cannot generate');
  });

  it('empty output', async () => {
    fakeCreate.mockResolvedValueOnce({
      output_text: '',
      error: null,
      incomplete_details: null,
    });

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('empty_output');
  });
});

// ---------------------------------------------------------------------------
// Schema / parse errors from model output
// ---------------------------------------------------------------------------

describe('handleModelCall — model output parse / schema', () => {
  it('non-JSON output_text → parse error', async () => {
    fakeCreate.mockResolvedValueOnce({
      output_text: 'This is not JSON!',
      error: null,
      incomplete_details: null,
    });

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('parse');
  });

  it('JSON that fails provider schema → schema error', async () => {
    // Valid JSON but missing required Architect fields
    fakeCreate.mockResolvedValueOnce({
      output_text: JSON.stringify({ id: 'missing-fields' }),
      error: null,
      incomplete_details: null,
    });

    const req = createFakeReq('POST', architectRequest);
    const res = createFakeRes();

    await handleModelCall(req, res);

    const result = res.jsonBody as Record<string, unknown>;
    const error = result.error as Record<string, unknown>;
    expect(error.reason).toBe('schema');
  });
});
