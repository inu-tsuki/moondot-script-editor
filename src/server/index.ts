// ---------------------------------------------------------------------------
// Server entry point
// ---------------------------------------------------------------------------
//
// Phase 3.4-pre: re-exports env reading and client factory.  The actual
// request handler for `/api/model/call` lives in vite.config.ts middleware.
//
// In Phase 3.4 this module will export the full handler that:
//   1. Parses `ModelCallRequest` from the request body
//   2. Resolves `schemaId` via `PROVIDER_SCHEMA_REGISTRY`
//   3. Calls OpenAI Responses API with:
//      `text: { format: zodTextFormat(providerSchema, formatName) }`
//   4. Runs `parseAndNormalizeProviderOutput()` on the response
//   5. Validates via app-side Zod + semantic validator
//   6. Returns `ModelCallResult` as JSON
// ---------------------------------------------------------------------------

export { canMakeRealCall, readServerEnv } from './env';
export type { ServerEnv } from './env';
export { handleModelCall } from './handler';
export { createOpenAIClient } from './openai-client';
