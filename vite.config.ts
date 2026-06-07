import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { handleModelCall } from './src/server/handler';

// ---------------------------------------------------------------------------
// Phase 3.4: local model proxy plugin
//
// Adds a `/api/model/call` endpoint to the Vite dev server.
// Full pipeline:
//   1. Parse request body (ModelCallRequest)
//   2. Read env (OPENAI_API_KEY, model name) from src/server/env.ts
//   3. Resolve schemaId via PROVIDER_SCHEMA_REGISTRY
//   4. Call OpenAI Responses API with structured output
//   5. Normalize + app-side Zod structural validation
//   6. Return ModelCallResult to client
// ---------------------------------------------------------------------------
const modelProxyPlugin = (): Plugin => ({
  name: 'moondot-model-proxy',
  configureServer(server) {
    const serverEnv = loadEnv(server.config.mode, process.cwd(), '');
    for (const key of ['OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_BASE_URL', 'OPENAI_USER_AGENT']) {
      if (serverEnv[key] && !process.env[key]) {
        process.env[key] = serverEnv[key];
      }
    }

    server.middlewares.use('/api/model/call', async (req, res) => {
      await handleModelCall(req, res);
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), modelProxyPlugin()],
  test: {
    environment: 'jsdom',
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    globals: true,
    setupFiles: './tests/setup.ts',
  },
});
