require('dotenv').config();
const { test }           = require('@playwright/test');
const { RapidLoginPage } = require('../pages/RapidLoginPage');
const { M3LoginPage }    = require('../pages/M3LoginPage');
const { orderData }      = require('../config/orderData');
const { URLS }           = require('../config/urls');

const env       = orderData.env;
const RAPID_URL = URLS[env].RAPID;
const M3_URL    = URLS[env].M3;
const EMAIL     = env === 'QA' ? process.env.QA_EMAIL    : process.env.UAT_EMAIL;
const PASSWORD  = env === 'QA' ? process.env.QA_PASSWORD : process.env.UAT_PASSWORD;

test.describe('Session Setup', () => {

  test(`Open Iron Hide + M3 (${env}) and keep browser alive`, async ({ browser }) => {
    test.setTimeout(0); // no timeout — stays open until manually closed

    const context = await browser.newContext();

    // ── Tab 1: Iron Hide (Rapid) ───────────────────────────────────
    const rapidPage  = await context.newPage();
    const rapidLogin = new RapidLoginPage(rapidPage);

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  SESSION SETUP  [${env}]`);
    console.log(`${'═'.repeat(50)}\n`);

    await test.step('Open Iron Hide and sign in with Brandix', async () => {
      console.log(`>>> Navigating to Iron Hide (${env}): ${RAPID_URL}`);
      await rapidLogin.goto(RAPID_URL);
      await rapidLogin.clickBrandixSignIn();
    });

    await test.step('Complete Microsoft login', async () => {
      await rapidLogin.completeMicrosoftLogin(EMAIL, PASSWORD);
    });

    await test.step('Select company from dropdown', async () => {
      await rapidLogin.selectFirstCompany();
      console.log('✅ Iron Hide company selected — session established');
    });

    // ── Tab 2: M3 ──────────────────────────────────────────────────
    const m3Page  = await context.newPage();
    const m3Login = new M3LoginPage(m3Page);

    await test.step('Open M3 and log in', async () => {
      console.log(`\n>>> Navigating to M3 (${env}): ${M3_URL}`);
      await m3Login.goto(M3_URL);
      await m3Login.login(EMAIL, PASSWORD);
      console.log('✅ M3 login complete');
    });

    // ── Keep browser open ──────────────────────────────────────────
    console.log('\n');
    console.log('🟢 ============================================');
    console.log('🟢  Both tabs are ready:');
    console.log(`🟢    Tab 1 — Iron Hide (${env})`);
    console.log(`🟢    Tab 2 — M3 (${env})`);
    console.log('🟢');
    console.log('🟢  Browser will stay open.');
    console.log('🟢  Close the browser window to end the session.');
    console.log('🟢 ============================================');
    console.log('\n');

    // Pause keeps the browser alive; the user closes it manually.
    await rapidPage.pause();
  });

});