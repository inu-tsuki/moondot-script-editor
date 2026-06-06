import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173/',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://127.0.0.1:5173/',
    channel: 'chromium',
    launchOptions: {
      executablePath: '/usr/bin/chromium',
    },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
