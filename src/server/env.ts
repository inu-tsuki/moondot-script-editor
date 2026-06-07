// ---------------------------------------------------------------------------
// Server environment configuration
// ---------------------------------------------------------------------------
//
// Reads model provider settings from environment variables.
// `.env.local` is not committed — only variable name templates are documented.
//
// Phase 3.4-pre: reads config but does not make real API calls.
// ---------------------------------------------------------------------------

export type ServerEnv = {
  /** OpenAI API key. Required for real model calls. */
  openaiApiKey: string | undefined;
  /** OpenAI model to use for structured output. */
  openaiModel: string;
  /** Base URL override for OpenAI-compatible proxies. */
  openaiBaseUrl: string | undefined;
};

/**
 * Read server configuration from process environment.
 *
 * The key variable names are:
 *   `OPENAI_API_KEY`  — API key (keep secret, never commit)
 *   `OPENAI_MODEL`    — model name, defaults to 'gpt-4.1-mini'
 *   `OPENAI_BASE_URL` — optional base URL for proxies
 */
export const readServerEnv = (): ServerEnv => ({
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
});

/**
 * Check whether enough config exists to attempt a real model call.
 * Returns `true` when OPENAI_API_KEY is set.
 */
export const canMakeRealCall = (env: ServerEnv): boolean =>
  Boolean(env.openaiApiKey && env.openaiApiKey.length > 0);
