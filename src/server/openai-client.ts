// ---------------------------------------------------------------------------
// OpenAI SDK client factory
// ---------------------------------------------------------------------------
//
// Phase 3.4-pre: skeleton only — exports a factory that will be wired up
// in Phase 3.4 to create real OpenAI clients for the local proxy.
//
// The client is created server-side only and never imported by React code.
// ---------------------------------------------------------------------------

import OpenAI from 'openai';
import type { ServerEnv } from './env';

/**
 * Create an OpenAI SDK client from server environment config.
 *
 * Phase 3.4-pre: exists as infrastructure scaffolding.  The actual
 * structured output call pipeline will be added in Phase 3.4.
 */
export const createOpenAIClient = (env: ServerEnv): OpenAI =>
  new OpenAI({
    apiKey: env.openaiApiKey,
    baseURL: env.openaiBaseUrl,
  });
