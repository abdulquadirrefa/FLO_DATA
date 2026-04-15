const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '../smoke',
  workers: 1,
  fullyParallel: false,
  retries: 0,           // no retries – prevents beforeAll (login) re-running on failure
  timeout: 120_000,
  expect: { timeout: 20000 },
  reporter: 'html',
  use: {
    headless: false,
    ignoreHTTPSErrors: true,
    actionTimeout:     30_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    video:      'on-first-retry',
    trace:      'on-first-retry',
    viewport:   { width: 1440, height: 900 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
