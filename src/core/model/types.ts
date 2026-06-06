import type { PromptMessage } from '../adaptation';
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
// Request / Result envelopes
// ---------------------------------------------------------------------------

export type ModelCallRequest = {
  messages: PromptMessage[];
  stage: string;
};

export type ModelCallResult<TData = unknown> = {
  data: TData | null;
  diagnostics: Diagnostic[];
  trace: ModelTraceEvent;
  error?: ModelCallError;
};

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

/**
 * Shared boundary between UI and model calls.
 *
 * Both mock (default) and future real providers implement this contract
 * so the UI never needs to know which provider is active.
 */
export type ModelAdapter = {
  readonly config: ModelProviderConfig;
  call<TData>(request: ModelCallRequest): Promise<ModelCallResult<TData>>;
};
