// ─────────────────────────────────────────────────────────────────────────────
// playwright.flo.config.js – Config for the FLO suite (tests/flo)
//
// Smoke, Master PO Planning and Trims/Fabric Inspection flows, headed on
// Chromium, one worker. Each spec logs into FLO itself (config/flo/credentials.js).
//
// Run: npm run smoke:headed | npm run master-po:headed | npm run trims … (see package.json)
// ─────────────────────────────────────────────────────────────────────────────

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/flo',
  workers: 1,
  fullyParallel: false,
  retries: 0,           // no retries – prevents beforeAll (login) re-running on failure
  timeout: 1_200_000,
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
