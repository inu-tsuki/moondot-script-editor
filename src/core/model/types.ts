import type { AdaptationPlan, PromptMessage } from '../adaptation';
import type { ScreenplayDocument } from '../screenplay';
import type { Diagnostic } from '../validation';

// ---------------------------------------------------------------------------
// Provider identity
// ---------------------------------------------------------------------------

export type ModelProviderType = 'mock' | 'local_proxy';

export type ModelProviderConfig = {
  provider: ModelProviderType;
  /** Request timeout in milliseconds. */
  timeoutMs: number;
};

// ---------------------------------------------------------------------------
// Structured error classification
// ---------------------------------------------------------------------------

export type ModelCallErrorReason =
  | 'config_missing' // no provider configured or API key missing
  | 'network' // timeout, connection refused, rate limited
  | 'refusal' // model refused to answer
  | 'empty_output' // model returned nothing usable
  | 'parse' // cannot parse as JSON / structured payload
  | 'schema' // structure does not match expected contract
  | 'semantic'; // valid structure but semantically wrong (e.g. broken sourceRefs)

export type ModelCallError = {
  reason: ModelCallErrorReason;
  message: string;
  /** Raw response that caused the error, for debugging. */
  raw?: string;
};

// ---------------------------------------------------------------------------
// Trace
// ---------------------------------------------------------------------------

export type ModelTraceOutcome = 'success' | 'fallback' | 'error';

export type ModelTraceEvent = {
  provider: ModelProviderType;
  /** Workflow stage label — not coupled to adaptation-specific enums. */
  stage: string;
  durationMs?: number;
  outcome: ModelTraceOutcome;
  fallbackReason?: ModelCallErrorReason;
};

// ---------------------------------------------------------------------------
// Stage → payload mapping (typed contract)
// ---------------------------------------------------------------------------

/** Known workflow stages. Each stage maps to a fixed artifact type below. */
export type ModelStage = 'adaptation_planning' | 'scene_draft';

/**
 * Payload type determined by `stage`, not by the caller.
 *
 * When a caller passes `stage: 'adaptation_planning'` the adapter resolves
 * with `ModelCallResult<AdaptationPlan>`.  There is no way to request a
 * different type for the same stage — the contract is enforced by this map.
 */
export type ModelStagePayloadMap = {
  adaptation_planning: AdaptationPlan;
  scene_draft: ScreenplayDocument;
};

// ---------------------------------------------------------------------------
// Request / Result envelopes
// ---------------------------------------------------------------------------

export type StructuredOutputContract = {
  /** Stable identifier for the response schema (e.g. 'adaptation_plan_v1'). */
  schemaId: string;
};

export type ModelCallRequest<S extends ModelStage = ModelStage> = {
  messages: PromptMessage[];
  stage: S;
  /**
   * Opaque token the caller can use to detect stale results.
   * The adapter echoes it back unchanged in `ModelCallResult.runId`.
   */
  runId?: string;
  /**
   * Provider-neutral structured output descriptor.
   * Set by the adaptation layer; consumed by real providers in Phase 3.4
   * to select the correct response schema.  Mock adapter ignores this field.
   *
   * This is intentionally a serializable data contract, not a runtime
   * schema object — it can cross the browser / local-proxy boundary
   * without carrying implementation details.
   */
  structuredOutput?: StructuredOutputContract;
};

export type ModelCallResult<TData = unknown> = {
  data: TData | null;
  diagnostics: Diagnostic[];
  trace: ModelTraceEvent;
  error?: ModelCallError;
  /** Echoed from the request — compare to detect stale responses. */
  runId?: string;
};

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

/**
 * Shared boundary between UI and model calls.
 *
 * Both mock (default) and future real providers implement this contract
 * so the UI never needs to know which provider is active.
 *
 * The return type is determined by `request.stage`, not by an explicit
 * type parameter — see `ModelStagePayloadMap`.
 */
export type ModelAdapter = {
  readonly config: ModelProviderConfig;

  /**
   * Issue a model call for the given stage.
   *
   * @returns Always resolves — even on failure the error is surfaced
   *          inside `ModelCallResult` rather than rejecting the promise.
   */
  call<S extends ModelStage>(
    request: ModelCallRequest<S>,
  ): Promise<ModelCallResult<ModelStagePayloadMap[S]>>;
};
