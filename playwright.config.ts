import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PW_BASE_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Each test spins up a real WebGL scene; more workers starve the GPU/CPU.
  workers: 2,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1' && !process.env.CI && !process.env.CODEX_CI,
    timeout: 30_000,
  },
});
