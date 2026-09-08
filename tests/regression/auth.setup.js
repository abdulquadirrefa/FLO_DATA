// ═════════════════════════════════════════════════════════════════════════════
//  Regression Suite – Authentication Setup
//  Logs into FLO once and persists the session to playwright/.auth/flo.json.
//  Every regression spec reuses this storage state (see playwright.regression.config.js)
//  so they start already authenticated — no spec needs its own login step.
// ═════════════════════════════════════════════════════════════════════════════

const { test, expect } = require('@playwright/test');
const path             = require('path');
const { FLO_CONFIG }   = require('../../config/flo/credentials');
const { FloLoginPage } = require('../../pages/flo/FloLoginPage');

const AUTH_FILE = path.join(__dirname, '../../playwright/.auth/flo.json');

test('authenticate as FLO user', async ({ page }) => {
  const loginPage = new FloLoginPage(page);

  console.log('\n[Auth Setup] Logging into FLO…');
  await loginPage.goto(FLO_CONFIG.baseURL);
  await loginPage.login(FLO_CONFIG.email, FLO_CONFIG.password);

  expect(await loginPage.isLoginSuccessful(), 'FLO login must succeed before regression suite can run').toBe(true);

  await page.context().storageState({ path: AUTH_FILE });
  console.log(`[Auth Setup] ✓ Session saved → ${AUTH_FILE}`);
});
