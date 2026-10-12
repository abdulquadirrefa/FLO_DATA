require('dotenv').config();
const { test }                    = require('@playwright/test');
const { RapidLoginPage }          = require('../../src/pages/m3/RapidLoginPage');
const { M3LoginPage }             = require('../../src/pages/m3/M3LoginPage');
const { M3NavigationPage }        = require('../../src/pages/m3/M3NavigationPage');
const { CustomerOrderPage }       = require('../../src/pages/m3/CustomerOrderPage');
const { LineEntryPage }           = require('../../src/pages/m3/LineEntryPage');
const { SchedulingReleasePage }   = require('../../src/pages/m3/SchedulingReleasePage');
const { orderData }               = require('../../config/m3/orderData');
const { addResult, printSummary } = require('../../src/utils/m3ResultsTracker');
const { URLS }                    = require('../../config/urls');
const coInput                     = require('../../data/m3/co-multiple-schedule.json');

const env       = orderData.env;
const RAPID_URL = URLS[env].RAPID;
const M3_URL    = URLS[env].M3;
const EMAIL     = env === 'QA' ? process.env.QA_EMAIL    : process.env.UAT_EMAIL;
const PASSWORD  = env === 'QA' ? process.env.QA_PASSWORD : process.env.UAT_PASSWORD;

// Existing CO from JSON; VPO from JSON (falls back to orderData.vpoNumber)
const CO_NUMBER  = String(coInput.coNumber).trim();
const VPO_NUMBER = coInput.vpoNumber || orderData.vpoNumber;

// ── Add new lines + new schedule to an existing CO ───────────────
async function runUpdateOrderFlow(context, env) {
  const m3Page     = await context.newPage();
  const m3Login    = new M3LoginPage(m3Page);
  const m3Nav      = new M3NavigationPage(m3Page, env);
  const custOrder  = new CustomerOrderPage(m3Page, env);
  const lineEntry  = new LineEntryPage(m3Page, env);
  const scheduling = new SchedulingReleasePage(m3Page, env);

  // ── M3 Login ──────────────────────────────────────────────────
  console.log('>>> Opening M3 tab...');
  await m3Login.goto(M3_URL);
  await m3Login.login(EMAIL, PASSWORD);
  console.log('>>> M3 login complete');

  // ── OIS300 Navigation ──────────────────────────────────────────
  if (env === 'QA') {
    await m3Nav.selectGlobalIfQA();
  }
  await m3Nav.openSearchWithCtrlR();
  await m3Nav.searchAndOpenOIS300();

  // ── Search CO, verify first row, select it ─────────────────────
  await m3Nav.searchAndSelectCoInOIS300(CO_NUMBER);

  // ── Open Update Order ──────────────────────────────────────────
  await m3Nav.openToolboxAndSelectUpdateOrder();

  // ── Customer Order Manager — change VPO and Update ─────────────
  await custOrder.verifyPageLoaded();
  await custOrder.verifyLoadedCoNumber(CO_NUMBER);
  await custOrder.updateVpoNumber(VPO_NUMBER);
  await custOrder.clickUpdateAndWaitForLineEntry();

  // ── Line Entry ─────────────────────────────────────────────────
  await lineEntry.scrollToLineEntry();
  await lineEntry.fillZFeature(orderData.zFeature);
  await lineEntry.fillDateCode(orderData.dateCode);
  await lineEntry.fillDestination(orderData.destination);
  await lineEntry.fillSalesChannel(orderData.salesChannel);
  await lineEntry.fillOtherZ(orderData.otherZ);
  await lineEntry.fillPackMethod(orderData.packMethod);
  await lineEntry.fillColorRowQty(orderData.expectedColor, orderData.sizeQty);
  await lineEntry.verifyAddLinesButton();
  await lineEntry.clickAddLines();
  // No Release for Costing in this flow

  // ── Scheduling and Release ─────────────────────────────────────
  await scheduling.clickStartTab();
  await scheduling.openSchedulingReleaseSDK();
  await scheduling.handleSchedulingFlow(
    { ...orderData, generatedCoNumber: CO_NUMBER },
    { pickNewestSchedule: true },
  );

  const scheduleNumber = scheduling._scheduleNumber;
  console.log(`>>> CO ${CO_NUMBER} - New Schedule Number: ${scheduleNumber}`);
  addResult(1, CO_NUMBER, scheduleNumber, orderData.m3Style);

  await m3Page.close();
  console.log('\n✅ CO with multiple schedule flow completed - M3 tab closed');
}

// ── Main test ──────────────────────────────────────────────────────
test.describe('M3 CO with Multiple Schedule', () => {

  test('Update existing CO with new lines and release new schedule', async ({ browser }) => {
    test.setTimeout(600000);

    console.log(`>>> CO Number: ${CO_NUMBER} | New VPO: ${VPO_NUMBER} | Style: ${orderData.m3Style}`);

    const context = await browser.newContext();

    // ── TAB 1: Rapid - SSO session ────────────────────────────────
    const rapidPage  = await context.newPage();
    const rapidLogin = new RapidLoginPage(rapidPage);

    await test.step('Open Rapid and click Brandix sign in', async () => {
      await rapidLogin.goto(RAPID_URL);
      await rapidLogin.clickBrandixSignIn();
    });

    await test.step('Complete Microsoft login', async () => {
      await rapidLogin.completeMicrosoftLogin(EMAIL, PASSWORD);
    });

    await test.step('Select first M3 company and confirm', async () => {
      await rapidLogin.selectFirstCompany();
    });

    await test.step(`Update CO ${CO_NUMBER} - add lines and release new schedule`, async () => {
      try {
        await runUpdateOrderFlow(context, env);
      } catch (err) {
        addResult(1, CO_NUMBER, 'FAILED', orderData.m3Style);
        printSummary();
        throw err;
      }
    });

    printSummary();
    await context.close();
  });

});
