// ---------------------------------------------------------------------------
// Proxy model adapter — calls /api/model/call via fetch
// ---------------------------------------------------------------------------
//
// Phase 3.4b: thin HTTP client that implements the ModelAdapter contract.
// The adapter serializes ModelCallRequest to JSON, POSTs it to the Vite
// dev-server endpoint, and deserializes the response as ModelCallResult.
//
// Unlike the mock adapter, this adapter does NOT require runtime context
// (document, preferences, plan). It simply forwards the request and
// returns whatever the server pipeline produced.
//
// All error paths resolve — never reject — per the ModelAdapter contract.
// ---------------------------------------------------------------------------

import type {
  ModelAdapter,
  ModelCallError,
  ModelCallRequest,
  ModelCallResult,
  ModelProviderConfig,
  ModelProviderType,
  ModelStage,
  ModelStagePayloadMap,
} from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const PROXY_PROVIDER_CONFIG: ModelProviderConfig = {
  provider: 'local_proxy',
  timeoutMs: 30_000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_ENDPOINT = '/api/model/call';

const buildEndpointUrl = (baseUrl: string): string => {
  // Normalize: strip trailing slash from base, ensure leading slash on path
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}${DEFAULT_ENDPOINT}`;
};

/**
 * Build a ModelCallResult for client-side fetch failures.
 *
 * These errors never reached the server — the fetch itself failed (timeout,
 * connection refused, no JSON response, etc.).
 */
const buildFetchErrorResult = (
  reason: ModelCallError['reason'],
  message: string,
  runId: string | undefined,
  stage: string,
  provider: ModelProviderType,
): ModelCallResult<unknown> => ({
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
    provider,
    stage,
    outcome: 'error',
    fallbackReason: reason,
  },
  error: { reason, message },
  runId,
});

/**
 * Map a fetch() rejection to a ModelCallError reason and message.
 */
const classifyFetchError = (
  err: unknown,
): { reason: ModelCallError['reason']; message: string } => {
  if (err instanceof Error) {
    // AbortError / TimeoutError → timeout
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      return {
        reason: 'network',
        message: `Model call timed out after ${PROXY_PROVIDER_CONFIG.timeoutMs}ms.`,
      };
    }

    // TypeError is typical for network failures (connection refused, DNS, etc.)
    if (err instanceof TypeError) {
      return {
        reason: 'network',
        message: `Network error — cannot reach model endpoint. (${err.message})`,
      };
    }

    return { reason: 'network', message: `Model call failed: ${err.message}` };
  }

  return { reason: 'network', message: 'Unknown error during model call.' };
};

/**
 * Minimal structural guard for a JSON value that claims to be a
 * ModelCallResult.  Ensures the envelope fields are present with
 * expected types before we cast and return it to the caller.
 *
 * This prevents malformed server / proxy responses from crashing
 * downstream code that assumes valid diagnostics / trace / error.
 */
const isModelCallResultEnvelope = (x: unknown): x is Record<string, unknown> => {
  if (x === null || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;

  // diagnostics must be an array (even if empty)
  if (!Array.isArray(obj.diagnostics)) return false;

  // data must exist as a key (null is acceptable)
  if (!('data' in obj)) return false;

  // trace must be a non-null object with at least a provider string
  const trace = obj.trace;
  if (trace === null || typeof trace !== 'object') return false;
  if (typeof (trace as Record<string, unknown>).provider !== 'string') return false;

  // error, if present, must have a reason string
  if (obj.error !== undefined && obj.error !== null) {
    const err = obj.error as Record<string, unknown>;
    if (typeof err.reason !== 'string') return false;
  }

  return true;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createProxyModelAdapter = (baseUrl = ''): ModelAdapter => {
  const endpointUrl = buildEndpointUrl(baseUrl);
  const { provider, timeoutMs } = PROXY_PROVIDER_CONFIG;

  return {
    config: PROXY_PROVIDER_CONFIG,

    async call<S extends ModelStage>(
      request: ModelCallRequest<S>,
    ): Promise<ModelCallResult<ModelStagePayloadMap[S]>> {
      const { stage, runId } = request;

      // ------------------------------------------------------------------
      // 1. Serialize request body
      // ------------------------------------------------------------------
      let body: string;
      try {
        body = JSON.stringify(request);
      } catch {
        return buildFetchErrorResult(
          'parse',
          'Failed to serialize model call request to JSON.',
          runId,
          stage,
          provider,
        ) as unknown as ModelCallResult<ModelStagePayloadMap[S]>;
      }

      // ------------------------------------------------------------------
      // 2. Fetch
      // ------------------------------------------------------------------
      let response: Response;
      try {
        response = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        const { reason, message } = classifyFetchError(err);
        return buildFetchErrorResult(
          reason,
          message,
          runId,
          stage,
          provider,
        ) as unknown as ModelCallResult<ModelStagePayloadMap[S]>;
      }

      // ------------------------------------------------------------------
      // 3. Parse response
      // ------------------------------------------------------------------
      let responseBody: string;
      try {
        responseBody = await response.text();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to read response body.';
        return buildFetchErrorResult(
          'network',
          message,
          runId,
          stage,
          provider,
        ) as unknown as ModelCallResult<ModelStagePayloadMap[S]>;
      }

      // ------------------------------------------------------------------
      // 4. Parse JSON
      // ------------------------------------------------------------------
      let parsed: unknown;
      try {
        parsed = JSON.parse(responseBody);
      } catch {
        // Non-JSON response from the server (HTML error page, etc.)
        const preview = responseBody.slice(0, 200);
        return buildFetchErrorResult(
          'network',
          `Server returned non-JSON response (HTTP ${response.status}). Body preview: "${preview}"`,
          runId,
          stage,
          provider,
        ) as unknown as ModelCallResult<ModelStagePayloadMap[S]>;
      }

      // ------------------------------------------------------------------
      // 5. Validate shape and return
      // ------------------------------------------------------------------
      if (isModelCallResultEnvelope(parsed)) {
        // Looks like a ModelCallResult — return as-is.
        // The caller (App.tsx) will run semantic validation on the data.
        return parsed as ModelCallResult<ModelStagePayloadMap[S]>;
      }

      // Server returned JSON but not in ModelCallResult shape — treat as
      // a client-side parse error.
      return buildFetchErrorResult(
        'parse',
        `Server returned unexpected JSON structure. (HTTP ${response.status})`,
        runId,
        stage,
        provider,
      ) as ModelCallResult<ModelStagePayloadMap[S]>;
    },
  };
};
