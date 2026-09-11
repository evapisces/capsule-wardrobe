import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end layout tests. These run a real headless Chromium against the Vite
 * dev server so we can measure `document.documentElement.scrollWidth` vs
 * `clientWidth` — the "no horizontal overflow" acceptance criterion from the
 * mobile/tablet responsiveness work (#3–#6), which jsdom cannot verify because
 * it performs no layout.
 *
 * No backend / Postgres is required: every `/api/**` request is stubbed by the
 * test (see `e2e/fixtures/api.ts`).
 */
const PORT = 4319;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
