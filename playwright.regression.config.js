// ─────────────────────────────────────────────────────────────────────────────
// playwright.regression.config.js – Config for the FLO Regression Suite
//
// Pattern: Playwright "setup project" authentication (industry standard).
//   1. The "setup" project runs auth.setup.js once, logs into FLO and
//      saves the authenticated session to playwright/.auth/flo.json.
//   2. The "regression" project depends on "setup" and reuses that storage
//      state, so every regression spec starts already logged in — no spec
//      needs its own login step.
//
// Run: npm run regression:headed
// ─────────────────────────────────────────────────────────────────────────────

const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

const AUTH_FILE = path.join(__dirname, 'playwright/.auth/flo.json');

module.exports = defineConfig({
  testDir: './tests/regression',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 1_200_000,
  expect: { timeout: 20000 },
  reporter: [['html', { open: 'always' }]],

  use: {
    headless: false,
    ignoreHTTPSErrors: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'regression',
      testMatch: /.*\.spec\.js/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },
  ],
});
