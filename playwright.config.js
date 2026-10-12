// ─────────────────────────────────────────────────────────────────────────────
// playwright.config.js – Default config: M3 data creation + GRN flows
//
// Runs everything under tests/ except the FLO and regression suites, i.e.
// tests/m3 and tests/grn, headed on Microsoft Edge. Those flows are long-running
// data-creation jobs, so there is no test timeout.
//
//   FLO suite        → playwright.flo.config.js
//   Regression suite → playwright.regression.config.js
//
// Run: npm run data:headed | npm run pl-split | npm run grn-api … (see package.json)
// ─────────────────────────────────────────────────────────────────────────────

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testIgnore: ['**/tests/flo/**', '**/tests/regression/**'],
  timeout: 0,
  expect: {
    timeout: 15000,   // individual expect/waitFor timeout
  },
  reporter: 'html',

  use: {
    baseURL: '',
    headless: false,
    ignoreHTTPSErrors: true,
    actionTimeout: 60000,
    navigationTimeout: 1200000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'msedge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});
