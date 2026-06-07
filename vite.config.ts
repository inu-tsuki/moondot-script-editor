import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// ---------------------------------------------------------------------------
// Phase 3.4-pre: local model proxy plugin (skeleton)
//
// Adds a `/api/model/call` endpoint to the Vite dev server.
// Phase 3.4 will wire this to the OpenAI SDK with:
//   1. Read env (OPENAI_API_KEY, model name) from src/server/env.ts
//   2. Resolve schemaId via PROVIDER_SCHEMA_REGISTRY
//   3. Call OpenAI API with structured output
//   4. Normalize + app-side validation
//   5. Return ModelCallResult to client
// ---------------------------------------------------------------------------
const modelProxyPlugin = (): Plugin => ({
  name: 'moondot-model-proxy',
  configureServer(server) {
    server.middlewares.use('/api/model/call', (req, res) => {
      res.statusCode = 501;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'not_implemented',
          message: 'Model proxy endpoint coming in Phase 3.4',
        }),
      );
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
