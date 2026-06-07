import { afterEach, describe, expect, it, vi } from 'vitest';

const mockOpenAI = vi.fn();

vi.mock('openai', () => ({
  default: mockOpenAI,
}));

describe('server OpenAI configuration', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
    mockOpenAI.mockClear();
  });

  it('reads optional OpenAI-compatible proxy config from env', async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: 'sk-test',
      OPENAI_MODEL: 'gpt-5.4',
      OPENAI_BASE_URL: 'https://www.micuapi.ai/v1',
      OPENAI_USER_AGENT: 'codex-cli-test',
    };

    const { readServerEnv } = await import('../../src/server/env');

    expect(readServerEnv()).toEqual({
      openaiApiKey: 'sk-test',
      openaiModel: 'gpt-5.4',
      openaiBaseUrl: 'https://www.micuapi.ai/v1',
      openaiUserAgent: 'codex-cli-test',
    });
  });

  it('passes baseURL and User-Agent override to the OpenAI SDK client', async () => {
    const env = {
      openaiApiKey: 'sk-test',
      openaiModel: 'gpt-5.4',
      openaiBaseUrl: 'https://www.micuapi.ai/v1',
      openaiUserAgent: 'codex-cli-test',
    };

    const { createOpenAIClient } = await import('../../src/server/openai-client');

    createOpenAIClient(env);

    expect(mockOpenAI).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: 'https://www.micuapi.ai/v1',
      defaultHeaders: { 'User-Agent': 'codex-cli-test' },
    });
  });

  it('omits defaultHeaders when no User-Agent override is configured', async () => {
    const env = {
      openaiApiKey: 'sk-test',
      openaiModel: 'gpt-4.1-mini',
      openaiBaseUrl: undefined,
      openaiUserAgent: undefined,
    };

    const { createOpenAIClient } = await import('../../src/server/openai-client');

    createOpenAIClient(env);

    expect(mockOpenAI).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: undefined,
      defaultHeaders: undefined,
    });
  });
});
