import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ServerEnv } from './env';

type ModelDebugEvent = {
  runId: string | undefined;
  stage: string;
  schemaId: string;
  outcome: string;
  env: ServerEnv;
  response?: unknown;
  outputText?: string | null;
  outputJson?: unknown;
  normalized?: unknown;
  error?: unknown;
};

const DEFAULT_DEBUG_DIR = '.debug/model-runs';

const isDebugEnabled = (): boolean =>
  process.env.MOONDOT_MODEL_DEBUG === '1' || process.env.MOONDOT_MODEL_DEBUG === 'true';

const getBaseUrlHost = (baseUrl: string | undefined): string | undefined => {
  if (!baseUrl) return undefined;
  try {
    return new URL(baseUrl).host;
  } catch {
    return 'invalid-url';
  }
};

const sanitizeEnv = (env: ServerEnv) => ({
  model: env.openaiModel,
  baseUrlHost: getBaseUrlHost(env.openaiBaseUrl),
  hasApiKey: Boolean(env.openaiApiKey),
  hasUserAgent: Boolean(env.openaiUserAgent),
});

const safeName = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);

export const writeModelDebugDump = async (event: ModelDebugEvent): Promise<void> => {
  if (!isDebugEnabled()) return;

  try {
    const dir = process.env.MOONDOT_MODEL_DEBUG_DIR || DEFAULT_DEBUG_DIR;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const runPart = event.runId ? safeName(event.runId) : 'no-run-id';
    const fileName = `${timestamp}_${safeName(event.stage)}_${safeName(event.outcome)}_${runPart}.json`;
    const body = {
      timestamp,
      runId: event.runId,
      stage: event.stage,
      schemaId: event.schemaId,
      outcome: event.outcome,
      env: sanitizeEnv(event.env),
      response: event.response,
      outputText: event.outputText,
      outputJson: event.outputJson,
      normalized: event.normalized,
      error: event.error,
    };

    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, fileName), JSON.stringify(body, null, 2), 'utf-8');
  } catch (err) {
    console.warn(
      '[moondot:model-debug] Failed to write model debug dump:',
      err instanceof Error ? err.message : err,
    );
  }
};
