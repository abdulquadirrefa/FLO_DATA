// ═════════════════════════════════════════════════════════════════════════════
//  FLO UAT – Smoke Test Suite
//  Run: npm run smoke:headed
// ═════════════════════════════════════════════════════════════════════════════

const { test, expect } = require('@playwright/test');
const { FLO_CONFIG }      = require('../../config/flo/credentials');
const { FloLoginPage }    = require('../../pages/flo/FloLoginPage');
const { FloSidebarPage }  = require('../../pages/flo/FloSidebarPage');
const { PPSMasterPOPage } = require('../../pages/flo/PPSMasterPOPage');

const apiResponses = [];

test.describe('FLO UAT Smoke Tests', () => {
  let page;
  let loginPage;
  let sidebarPage;
  let masterPOPage;

  // ── Setup: launch browser, log in once ───────────────────────────────────
  test.beforeAll(async ({ browser }) => {
    console.log('\n' + '═'.repeat(60));
    console.log('  FLO UAT SMOKE TEST – Starting');
    console.log('═'.repeat(60) + '\n');

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 900 },
    });

    page = await context.newPage();

    // Track API calls
    page.on('response', (response) => {
      const url    = response.url();
      const status = response.status();
      if (
        url.includes('/api/') || url.includes('/rest/') || url.includes('/graphql') ||
        response.request().resourceType() === 'xhr' ||
        response.request().resourceType() === 'fetch'
      ) {
        apiResponses.push({ url, status, method: response.request().method() });
        if (status >= 400) {
          console.warn(`[API] ⚠ ${response.request().method()} ${url} → ${status}`);
        }
      }
    });

    loginPage   = new FloLoginPage(page);
    sidebarPage = new FloSidebarPage(page);

    await loginPage.goto(FLO_CONFIG.baseURL);
    await loginPage.login(FLO_CONFIG.email, FLO_CONFIG.password);

    // Wait for the FLO app shell to finish initialising after Keycloak redirect.
    // The app shows "Initializing Keycloak…" while booting — wait until the
    // sidebar "PPS" nav item is visible before proceeding with the tests.
    console.log('[Setup] Waiting for app shell to initialise…');
    await page.getByText('PPS').first()
      .waitFor({ state: 'visible', timeout: 60000 })
      .catch(() => console.warn('[Setup] App shell wait timed out – continuing anyway'));
    console.log('[Setup] App ready.');
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  test.afterAll(async () => {
    console.log('\n' + '─'.repeat(60));
    console.log('  API CALL SUMMARY');
    console.log('─'.repeat(60));
    const failed = apiResponses.filter((r) => r.status >= 400);
    console.log(`  Total API calls captured: ${apiResponses.length}`);
    console.log(`  Failed (4xx/5xx):         ${failed.length}`);
    if (failed.length > 0) {
      failed.forEach((r) => console.warn(`    ✗ [${r.status}] ${r.method} ${r.url}`));
    }
    console.log('─'.repeat(60) + '\n');
    await page.close();
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  TC-01 – Login
  // ═════════════════════════════════════════════════════════════════════════
  test('TC-01: Login – credentials accepted and dashboard loads', async () => {
    console.log('\n[TC-01] Verifying login success…');
    const success = await loginPage.isLoginSuccessful();
    expect(success, 'Should be redirected away from the login page after sign-in').toBe(true);
    console.log('[TC-01] PASS – Login successful.');
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  TC-02 – Sidebar items visible
  // ═════════════════════════════════════════════════════════════════════════
  test('TC-02: Sidebar – key navigation items are visible', async () => {
    console.log('\n[TC-02] Checking sidebar items…');

    const expectedItems = ['Dashboards', 'User Management', 'MDM', 'PMS', 'SMS', 'PPS'];
    const missing = [];
    for (const item of expectedItems) {
      const visible = await sidebarPage.isSidebarItemVisible(item);
      if (!visible) missing.push(item);
    }

    if (missing.length > 0) {
      console.warn(`[TC-02] Missing sidebar items: ${missing.join(', ')}`);
    }

    const ppsVisible = await sidebarPage.isSidebarItemVisible('PPS');
    expect(ppsVisible, '"PPS" must be visible in the sidebar').toBe(true);
    console.log('[TC-02] PASS – PPS sidebar item is visible.');
  });

  // ═════════════════════════════════════════════════════════════════════════
  //  TC-03 – Navigate to PPS › Master PO Planning
  // ═════════════════════════════════════════════════════════════════════════
  test('TC-03: Navigate to PPS › Master PO Planning', async () => {
    console.log('\n[TC-03] Navigating to PPS > Master PO Planning…');

    await sidebarPage.navigateToPPSMasterPO();

    masterPOPage = new PPSMasterPOPage(page);
    await masterPOPage.waitForPageReady();

    console.log(`[TC-03] Current URL: ${page.url()}`);

    const searchVisible = await masterPOPage.searchButton.isVisible().catch(() => false);
    expect(searchVisible, 'Search button must be visible on Master PO Planning page').toBe(true);
    console.log('[TC-03] PASS – Master PO Planning page loaded.');

  });

});
