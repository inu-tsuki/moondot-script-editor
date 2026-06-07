import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeModelDebugDump } from '../../src/server/model-debug';

describe('writeModelDebugDump', () => {
  const originalEnv = process.env;

  afterEach(async () => {
    process.env = originalEnv;
  });

  it('does nothing unless model debug is enabled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'moondot-model-debug-disabled-'));
    process.env = {
      ...originalEnv,
      MOONDOT_MODEL_DEBUG_DIR: dir,
      MOONDOT_MODEL_DEBUG: '',
    };

    await writeModelDebugDump({
      runId: 'run-disabled',
      stage: 'adaptation_planning',
      schemaId: 'adaptation_plan_v1',
      outcome: 'success',
      env: {
        openaiApiKey: 'sk-secret',
        openaiModel: 'gpt-5.4',
        openaiBaseUrl: 'https://www.micuapi.ai/v1',
        openaiUserAgent: 'secret-ua',
      },
      outputText: '{}',
    });

    await expect(readFile(join(dir, 'missing.json'), 'utf-8')).rejects.toThrow();
    await rm(dir, { recursive: true, force: true });
  });

  it('writes sanitized local debug dumps when enabled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'moondot-model-debug-'));
    process.env = {
      ...originalEnv,
      MOONDOT_MODEL_DEBUG: '1',
      MOONDOT_MODEL_DEBUG_DIR: dir,
    };

    await writeModelDebugDump({
      runId: 'run-123',
      stage: 'adaptation_planning',
      schemaId: 'adaptation_plan_v1',
      outcome: 'app_schema_error',
      env: {
        openaiApiKey: 'sk-secret',
        openaiModel: 'gpt-5.4',
        openaiBaseUrl: 'https://www.micuapi.ai/v1',
        openaiUserAgent: 'secret-ua',
      },
      response: { output_text: '{"id":"plan"}' },
      outputText: '{"id":"plan"}',
      error: [{ path: ['sceneOutline', 1, 'estimatedBlocks'], message: 'Expected int' }],
    });

    const files = await import('node:fs/promises').then((fs) => fs.readdir(dir));
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('adaptation_planning_app_schema_error_run-123');

    const dump = await readFile(join(dir, files[0]), 'utf-8');
    expect(dump).toContain('"model": "gpt-5.4"');
    expect(dump).toContain('"baseUrlHost": "www.micuapi.ai"');
    expect(dump).toContain('"hasApiKey": true');
    expect(dump).toContain('"hasUserAgent": true');
    expect(dump).not.toContain('sk-secret');
    expect(dump).not.toContain('secret-ua');

    await rm(dir, { recursive: true, force: true });
  });
});
