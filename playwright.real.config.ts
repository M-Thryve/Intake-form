import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'production-gate.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: 'http://localhost:8444',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'authenticated-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/start-real-service.mjs api',
      url: 'http://localhost:3200/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'node e2e/start-real-service.mjs web',
      url: 'http://localhost:8444',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
