require('dotenv').config();
const { test }                  = require('@playwright/test');
const { RapidLoginPage }        = require('../pages/RapidLoginPage');
const { M3LoginPage }           = require('../pages/M3LoginPage');
const { M3NavigationPage }      = require('../pages/M3NavigationPage');
const { CustomerOrderPage }     = require('../pages/CustomerOrderPage');
const { LineEntryPage }         = require('../pages/LineEntryPage');
const { CostingApprovalPage }   = require('../pages/CostingApprovalPage');
const { SchedulingReleasePage } = require('../pages/SchedulingReleasePage');
const { orderData }             = require('../config/orderData');
const { addResult, printSummary } = require('../config/resultsTracker');
const { URLS }                  = require('../config/urls');

const env       = orderData.env;            
const RAPID_URL = URLS[env].RAPID;
const M3_URL    = URLS[env].M3;
const EMAIL     = env === 'QA' ? process.env.QA_EMAIL    : process.env.UAT_EMAIL;
const PASSWORD  = env === 'QA' ? process.env.QA_PASSWORD : process.env.UAT_PASSWORD;

// ── Single M3 run ─────────────────────────────────────────────────
async function runM3Flow(context, runNumber, env) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  STARTING RUN ${runNumber}`);
  console.log(`${'═'.repeat(50)}\n`);

  // Open a new M3 tab - SSO session already established from Rapid
  const m3Page          = await context.newPage();
  const m3Login         = new M3LoginPage(m3Page);
  const m3Nav           = new M3NavigationPage(m3Page, env);
  let custOrder         = new CustomerOrderPage(m3Page, env);
  let lineEntry         = new LineEntryPage(m3Page, env);
  const costingApproval = new CostingApprovalPage(m3Page, env);
  const scheduling      = new SchedulingReleasePage(m3Page, env);
  // ── M3 Login ──────────────────────────────────────────────────
  console.log('>>> Opening M3 tab...');
  await m3Login.goto(M3_URL);
  console.log('>>> M3 page loaded, attempting login...');
  await m3Login.login(EMAIL, PASSWORD);
  console.log('>>> M3 login complete');

  // ── OIS300 Navigation ──────────────────────────────────────────
  console.log('>>> Current URL before Ctrl+R:', m3Page.url());
  // QA only — select Global from page menu before searching
  if (env === 'QA') {
    await m3Nav.selectGlobalIfQA();
  }

  await m3Nav.openSearchWithCtrlR();
  await m3Nav.searchAndOpenOIS300();

  // ── Open Create Order ──────────────────────────────────────────
  await m3Nav.openToolboxAndSelectCreateOrder();
  const frames = m3Page.frames();
  console.log('>>> Total frames after Create Order:', frames.length);
  frames.forEach((f, i) => console.log(`>>> Frame ${i}: ${f.url()}`));


  custOrder = new CustomerOrderPage(m3Page, env);
  lineEntry = new LineEntryPage(m3Page, env);

  // ── Customer Order Form ────────────────────────────────────────
  await custOrder.verifyPageLoaded();
  await custOrder.selectFacility(orderData.facility);
  await custOrder.selectStyle(orderData.buyerDivision, orderData.m3Style);
  await custOrder.fillFormFields(orderData);

  if (!orderData.skipDateSelection) {
    await custOrder.selectFutureDate();
  }

  const coNumber = await custOrder.clickCreateAndGetCoNumber();
  console.log(`>>> Run ${runNumber} - CO Number: ${coNumber}`);
  orderData.generatedCoNumber = coNumber;

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
  await lineEntry.clickReleaseForCosting();

  // ── Costing Approval ───────────────────────────────────────────
  await costingApproval.clickStartTab();
  await costingApproval.openCostingApprovalSDK();
  await costingApproval.fillCategory('Confirmed');
  await costingApproval.fillStyle(orderData.m3Style);
  await costingApproval.waitForLoadAndClick();
  await costingApproval.fillCoFilter(orderData.generatedCoNumber);
  await costingApproval.verifyCoNumberInTable(orderData.generatedCoNumber);
  await costingApproval.selectFirstRowCheckbox();
  await costingApproval.clickApprove();
  await m3Page.waitForTimeout(5000);

  // ── Scheduling and Release ─────────────────────────────────────
  await scheduling.clickStartTab();
  await scheduling.openSchedulingReleaseSDK();
  await scheduling.handleSchedulingFlow(orderData);

  const scheduleNumber = scheduling._scheduleNumber;
  console.log(`>>> Run ${runNumber} - Schedule Number: ${scheduleNumber}`);

  // ── Store result ───────────────────────────────────────────────
  addResult(runNumber, coNumber, scheduleNumber, orderData.m3Style);

  // ── Close ONLY the M3 tab - keep Rapid tab alive ───────────────
  await m3Page.close();
  console.log(`\n✅ Run ${runNumber} completed - M3 tab closed`);
}

// ── Main test ──────────────────────────────────────────────────────
test.describe('M3 Data Creation', () => {

  test('Customer Order Creation Flow', async ({ browser }) => {
    test.setTimeout(600000 * orderData.runCount);

    const context = await browser.newContext();

    // ── TAB 1: Rapid UAT - stays open throughout all runs ─────────
    const rapidPage  = await context.newPage();
    const rapidLogin = new RapidLoginPage(rapidPage);

    await test.step('Open Rapid UAT and click Brandix sign in', async () => {
      await rapidLogin.goto(RAPID_URL);
      await rapidLogin.clickBrandixSignIn();
    });

    await test.step('Complete Microsoft login', async () => {
      await rapidLogin.completeMicrosoftLogin(EMAIL, PASSWORD);
    });

    await test.step('Select first M3 company and confirm', async () => {
      await rapidLogin.selectFirstCompany();
    });

    console.log('✅ Rapid UAT login complete - session ready for all runs');

    // ── Run N times ────────────────────────────────────────────────
    for (let run = 1; run <= orderData.runCount; run++) {
      await test.step(`Run ${run} - Full data creation flow`, async () => {
        try {
          await runM3Flow(context, run, env);
        } catch (err) {
          console.error(`\n❌ Run ${run} failed: ${err.message}`);
          addResult(run, 'FAILED', 'FAILED', orderData.m3Style);
        }
      });

      // Wait between runs except after the last one
      if (run < orderData.runCount) {
        console.log(`\n⏳ Waiting ${orderData.delayBetweenRuns / 1000}s before Run ${run + 1}...\n`);
        await new Promise(resolve =>
          setTimeout(resolve, orderData.delayBetweenRuns)
        );
      }
    }

    // ── Print final summary ────────────────────────────────────────
    printSummary();

    await context.close();
  });

});