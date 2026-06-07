// ---------------------------------------------------------------------------
// /api/model/call request handler
// ---------------------------------------------------------------------------
//
// Phase 3.4: full pipeline from ModelCallRequest to ModelCallResult via
// OpenAI Responses API structured output.
//
// Pipeline:
//   parse request → env check → schemaId resolve → SDK call →
//   output_text extraction → JSON.parse → parseAndNormalizeProviderOutput →
//   app-side Zod safeParse → ModelCallResult
//
// Each failure mode maps to a distinct ModelCallError.reason.
// ---------------------------------------------------------------------------

import type { IncomingMessage, ServerResponse } from 'node:http';
import { zodTextFormat } from 'openai/helpers/zod';
import {
  APIError,
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from 'openai';
import {
  ADAPTATION_PLAN_SCHEMA_ID,
  adaptationPlanSchema,
} from '../core/adaptation/adaptation-plan-schema';
import {
  parseAndNormalizeProviderOutput,
  resolveProviderSchema,
} from '../core/adaptation/provider-schemas';
import type { ProviderSchemaEntry } from '../core/adaptation/provider-schemas';
import {
  WRITER_SCENE_PATCH_SCHEMA_ID,
  writerScenePatchSchema,
} from '../core/adaptation/writer-scene-patch-schema';
import type { ModelCallError, ModelCallErrorReason, ModelCallResult } from '../core/model/types';
import type { PromptMessage } from '../core/adaptation/types';
import { ZodObject, z } from 'zod';
import type { ServerEnv } from './env';
import { canMakeRealCall, readServerEnv } from './env';
import { createOpenAIClient } from './openai-client';
import { writeModelDebugDump } from './model-debug';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read the full request body from the incoming stream.
 */
const readRequestBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });

/**
 * Minimal shape guard for ModelCallRequest.
 * Does NOT validate message content or schemaId values — only checks
 * the structural envelope required to proceed.
 */
const isModelCallRequestShape = (
  x: unknown,
): x is {
  messages: PromptMessage[];
  stage: string;
  runId?: string;
  structuredOutput: { schemaId: string };
} => {
  if (x === null || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  if (!Array.isArray(obj.messages)) return false;
  if (obj.structuredOutput === null || typeof obj.structuredOutput !== 'object') return false;
  const so = obj.structuredOutput as Record<string, unknown>;
  if (typeof so.schemaId !== 'string') return false;
  return true;
};

/**
 * Map our PromptMessage[] to OpenAI Responses API `input` and `instructions`.
 *
 * System messages → `instructions` (joined).
 * User messages → `input` array of `{ role, content }`.
 */
const mapPromptMessages = (
  msgs: PromptMessage[],
): { input: Array<{ role: 'user'; content: string }>; instructions: string } => {
  const input: Array<{ role: 'user'; content: string }> = [];
  const systemLines: string[] = [];

  for (const msg of msgs) {
    if (msg.role === 'system') {
      systemLines.push(msg.content);
    } else {
      input.push({ role: 'user', content: msg.content });
    }
  }

  return { input, instructions: systemLines.join('\n\n') };
};

/**
 * Check whether the response represents a model refusal.
 *
 * In OpenAI's Responses API, a refusal manifests as:
 * - `incomplete_details.reason === 'content_filter'`, or
 * - `error.code` indicating a policy rejection, or
 * - an output message content part with `type: 'refusal'`.
 */
const isRefusal = (response: {
  error?: { code?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type: string; refusal?: string; text?: string }>;
  }>;
}): boolean => {
  if (response.incomplete_details?.reason === 'content_filter') return true;
  if (response.error?.code === 'invalid_prompt') return true;

  // Check output message content for refusal parts
  const output = response.output ?? [];
  for (const item of output) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (part.type === 'refusal') return true;
      }
    }
  }

  return false;
};

/**
 * Extract the generated text from a Responses API response.
 *
 * Uses the convenience `output_text` field that the SDK adds.
 */
const extractOutputText = (response: { output_text?: string }): string | null =>
  response.output_text?.trim() || null;

/**
 * Extract refusal text from a Responses API response.
 *
 * Checks output message content parts for `{ type: 'refusal', refusal: '...' }`.
 * Returns the first refusal text found, or null.
 */
const extractRefusalText = (response: {
  output?: Array<{
    type?: string;
    content?: Array<{ type: string; refusal?: string }>;
  }>;
}): string | null => {
  const output = response.output ?? [];
  for (const item of output) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (part.type === 'refusal' && part.refusal) {
          return part.refusal;
        }
      }
    }
  }
  return null;
};

/**
 * Classify an error thrown by the OpenAI SDK into a ModelCallError.
 */
const classifySDKError = (err: unknown): ModelCallError => {
  if (err instanceof AuthenticationError) {
    return {
      reason: 'config_missing',
      message: `OpenAI authentication failed — check your OPENAI_API_KEY. (${err.message})`,
    };
  }

  if (err instanceof APIConnectionError || err instanceof APIConnectionTimeoutError) {
    return {
      reason: 'network',
      message: `Network error: ${err.message}`,
    };
  }

  if (err instanceof RateLimitError) {
    return {
      reason: 'network',
      message: `Rate limited (429). ${err.message}`,
    };
  }

  if (err instanceof InternalServerError) {
    return {
      reason: 'network',
      message: `OpenAI server error (5xx). ${err.message}`,
    };
  }

  if (err instanceof APIError) {
    return {
      reason: 'network',
      message: `OpenAI API error (${err.status ?? 'unknown'}): ${err.message}`,
    };
  }

  // Unknown / unexpected error
  return {
    reason: 'network',
    message: err instanceof Error ? err.message : 'Unknown error during model call.',
  };
};

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------

interface SuccessContext {
  stage: string;
  schemaId: string;
  durationMs: number;
}

const buildSuccessResult = <TData>(
  data: TData,
  runId: string | undefined,
  ctx: SuccessContext,
): ModelCallResult<TData> => ({
  data,
  diagnostics: [],
  trace: {
    provider: 'local_proxy',
    stage: ctx.stage,
    durationMs: ctx.durationMs,
    outcome: 'success',
  },
  runId,
});

const buildErrorResult = (
  error: ModelCallError,
  runId: string | undefined,
  stage: string,
): ModelCallResult<null> => ({
  data: null,
  diagnostics: [
    {
      severity: 'error',
      code: `model_${error.reason}`,
      message: error.message,
      path: 'model',
    },
  ],
  trace: {
    provider: 'local_proxy',
    stage,
    outcome: 'error',
    fallbackReason: error.reason,
  },
  error,
  runId,
});

const makeError = (reason: ModelCallErrorReason, message: string): ModelCallError => ({
  reason,
  message,
});

// ---------------------------------------------------------------------------
// Schema selection
// ---------------------------------------------------------------------------

/**
 * Return the app-side Zod schema that corresponds to the given `schemaId`.
 * Used for the final structural validation step after normalizer output.
 */
const resolveAppSchema = (schemaId: string): ZodObject<z.ZodRawShape> | null => {
  if (schemaId === ADAPTATION_PLAN_SCHEMA_ID)
    return adaptationPlanSchema as unknown as ZodObject<z.ZodRawShape>;
  if (schemaId === WRITER_SCENE_PATCH_SCHEMA_ID)
    return writerScenePatchSchema as unknown as ZodObject<z.ZodRawShape>;
  return null;
};

// ---------------------------------------------------------------------------
// Stage / schemaId pairing
// ---------------------------------------------------------------------------

/**
 * Allowlist of valid stage → schemaId pairs.
 *
 * The HTTP boundary must enforce this pairing; client-side TypeScript
 * `ModelStagePayloadMap` cannot protect raw JSON POST bodies.
 */
const STAGE_SCHEMA_ALLOWLIST: Record<string, string> = {
  adaptation_planning: ADAPTATION_PLAN_SCHEMA_ID,
  scene_draft: WRITER_SCENE_PATCH_SCHEMA_ID,
};

const isValidStageSchemaPair = (stage: string, schemaId: string): boolean =>
  STAGE_SCHEMA_ALLOWLIST[stage] === schemaId;

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const handleModelCall = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const startedAt = Date.now();

  // -- helpers to send a response and bail out --
  const sendJson = (statusCode: number, body: unknown): void => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };

  // -- 1. Method check --
  if (req.method !== 'POST') {
    sendJson(
      405,
      buildErrorResult(makeError('config_missing', 'Only POST is accepted.'), undefined, 'unknown'),
    );
    return;
  }

  // -- 2. Read body --
  let body: string;
  try {
    body = await readRequestBody(req);
  } catch {
    sendJson(
      400,
      buildErrorResult(makeError('parse', 'Failed to read request body.'), undefined, 'unknown'),
    );
    return;
  }

  // -- 3. Parse JSON --
  let rawRequest: unknown;
  try {
    rawRequest = JSON.parse(body);
  } catch {
    sendJson(
      400,
      buildErrorResult(makeError('parse', 'Request body is not valid JSON.'), undefined, 'unknown'),
    );
    return;
  }

  // -- 4. Shape guard --
  if (!isModelCallRequestShape(rawRequest)) {
    sendJson(
      400,
      buildErrorResult(
        makeError(
          'parse',
          'Request body must contain "messages" (array) and "structuredOutput.schemaId" (string).',
        ),
        undefined,
        'unknown',
      ),
    );
    return;
  }

  const { messages, stage, runId, structuredOutput } = rawRequest;
  const { schemaId } = structuredOutput;

  // -- 5. Validate stage / schemaId pairing --
  if (!STAGE_SCHEMA_ALLOWLIST[stage]) {
    sendJson(
      200,
      buildErrorResult(
        makeError(
          'config_missing',
          `Unknown model stage: "${stage}". Expected "adaptation_planning" or "scene_draft".`,
        ),
        runId,
        stage,
      ),
    );
    return;
  }

  if (!isValidStageSchemaPair(stage, schemaId)) {
    sendJson(
      200,
      buildErrorResult(
        makeError(
          'config_missing',
          `Stage "${stage}" expects schemaId "${STAGE_SCHEMA_ALLOWLIST[stage]}", but received "${schemaId}".`,
        ),
        runId,
        stage,
      ),
    );
    return;
  }

  // -- 6. Read env --
  const env: ServerEnv = readServerEnv();
  if (!canMakeRealCall(env)) {
    sendJson(
      200,
      buildErrorResult(
        makeError(
          'config_missing',
          'OPENAI_API_KEY is not set. Configure it in .env.local to enable real model calls.',
        ),
        runId,
        stage,
      ),
    );
    return;
  }

  // -- 7. Resolve schemaId --
  const entry: ProviderSchemaEntry | undefined = resolveProviderSchema(schemaId);
  if (!entry) {
    sendJson(
      200,
      buildErrorResult(
        makeError(
          'config_missing',
          `Unknown schemaId: "${schemaId}". No provider schema registered.`,
        ),
        runId,
        stage,
      ),
    );
    return;
  }

  // -- 8. Map messages --
  const { input, instructions } = mapPromptMessages(messages);

  // -- 9. Build SDK call config --
  const client = createOpenAIClient(env);
  const textFormat = zodTextFormat(entry.providerSchema, entry.formatName);

  // -- 10. Call OpenAI --
  let response: {
    output_text?: string;
    error?: { code?: string } | null;
    incomplete_details?: { reason?: string } | null;
    output?: Array<{
      type?: string;
      content?: Array<{ type: string; refusal?: string; text?: string }>;
    }>;
  };
  try {
    response = (await client.responses.create({
      model: env.openaiModel,
      input,
      instructions: instructions || undefined,
      text: { format: textFormat },
    })) as unknown as typeof response;
  } catch (err) {
    const sdkError = classifySDKError(err);
    await writeModelDebugDump({
      runId,
      stage,
      schemaId,
      outcome: `sdk_error_${sdkError.reason}`,
      env,
      error: sdkError,
    });
    sendJson(200, buildErrorResult(sdkError, runId, stage));
    return;
  }

  // -- 11. Refusal check --
  if (isRefusal(response)) {
    const refusalText = extractRefusalText(response);
    const reason =
      response.incomplete_details?.reason === 'content_filter'
        ? 'content_filter'
        : response.error?.code === 'invalid_prompt'
          ? 'invalid_prompt'
          : 'refusal';
    const message = refusalText
      ? `Model refused to generate output. Reason: ${reason}. Refusal: "${refusalText.slice(0, 200)}"`
      : `Model refused to generate output. Reason: ${reason}.`;
    await writeModelDebugDump({
      runId,
      stage,
      schemaId,
      outcome: 'refusal',
      env,
      response,
      error: { reason, message },
    });
    sendJson(200, buildErrorResult(makeError('refusal', message), runId, stage));
    return;
  }

  // -- 12. Extract output text --
  const outputText = extractOutputText(response);
  if (!outputText) {
    await writeModelDebugDump({
      runId,
      stage,
      schemaId,
      outcome: 'empty_output',
      env,
      response,
      outputText,
    });
    sendJson(
      200,
      buildErrorResult(makeError('empty_output', 'Model returned no output text.'), runId, stage),
    );
    return;
  }

  // -- 13. Parse output as JSON --
  let outputJson: unknown;
  try {
    outputJson = JSON.parse(outputText);
  } catch {
    await writeModelDebugDump({
      runId,
      stage,
      schemaId,
      outcome: 'parse_error',
      env,
      response,
      outputText,
    });
    sendJson(
      200,
      buildErrorResult(makeError('parse', 'Model output is not valid JSON.'), runId, stage),
    );
    return;
  }

  // -- 14. Provider schema parse + normalize --
  const normalizedResult = parseAndNormalizeProviderOutput(entry, outputJson);
  if (!normalizedResult.success) {
    await writeModelDebugDump({
      runId,
      stage,
      schemaId,
      outcome: 'provider_schema_error',
      env,
      response,
      outputText,
      outputJson,
      error: normalizedResult,
    });
    sendJson(200, buildErrorResult(makeError('schema', normalizedResult.message), runId, stage));
    return;
  }

  // -- 15. App-side Zod structural validation --
  const appSchema = resolveAppSchema(schemaId);
  if (!appSchema) {
    // Should not happen — entry exists but no app schema mapped
    sendJson(
      200,
      buildErrorResult(
        makeError('config_missing', `No app-side schema registered for schemaId: "${schemaId}".`),
        runId,
        stage,
      ),
    );
    return;
  }

  const appParsed = appSchema.safeParse(normalizedResult.normalized);
  if (!appParsed.success) {
    const firstIssue = appParsed.error.issues[0];
    const message = firstIssue
      ? `App-side schema validation failed at ${firstIssue.path.join('.')}: ${firstIssue.message}`
      : 'App-side schema validation failed.';
    await writeModelDebugDump({
      runId,
      stage,
      schemaId,
      outcome: 'app_schema_error',
      env,
      response,
      outputText,
      outputJson,
      normalized: normalizedResult.normalized,
      error: appParsed.error.issues,
    });
    sendJson(200, buildErrorResult(makeError('schema', message), runId, stage));
    return;
  }

  // -- 16. Success --
  const durationMs = Date.now() - startedAt;
  await writeModelDebugDump({
    runId,
    stage,
    schemaId,
    outcome: 'success',
    env,
    response,
    outputText,
    outputJson,
    normalized: normalizedResult.normalized,
  });
  sendJson(
    200,
    buildSuccessResult(normalizedResult.normalized, runId, { stage, schemaId, durationMs }),
  );
};
