const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  workers:        1,
  fullyParallel:  false,
  retries:        0,
  timeout:        0,
  use: {
    headless:           false,
    ignoreHTTPSErrors:  true,
    actionTimeout:      30_000,
    navigationTimeout:  60_000,
    viewport:           { width: 1440, height: 900 },
    launchOptions: {
      args: ['--force-device-scale-factor=0.8'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
