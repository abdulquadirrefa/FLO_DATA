// ═════════════════════════════════════════════════════════════════════════════
//  Regression – TMS (Trims Management System) – Sewing Trims
//
//    • Uses the shared FLO session from auth.setup.js — no login needed here.
//    • Test data lives in data/regression/tms.data.json.
//    • Selectors: locators/flo/TMSLocators.js
//    • Page steps:  pages/flo/TMSPage.js
//
//  Run: npm run regression:headed
// ═════════════════════════════════════════════════════════════════════════════

const { test, expect } = require('@playwright/test');
const { FLO_CONFIG }   = require('../../config/flo/credentials');
const { TMSPage }      = require('../../pages/flo/TMSPage');
const data             = require('../../data/regression/tms.data.json');

async function failStep(page, stepName, err) {
  console.error(`\n[FAIL] ${stepName}: ${err.message}`);
  const screenshot = await page.screenshot({ fullPage: true });
  await test.info().attach(`FAIL – ${stepName}`, {
    body:        screenshot,
    contentType: 'image/png',
  });
  throw err;
}

test.describe('TMS (Regression)', () => {

  test('Open sewing job from TMS dashboard', async ({ page }) => {
    test.setTimeout(300_000);

    const { scheduleTrack, sewingJobNumber } = data.tmsRequest;
    expect(scheduleTrack,   'Set tmsRequest.scheduleTrack in tms.data.json').toBeTruthy();
    expect(sewingJobNumber, 'Set tmsRequest.sewingJobNumber in tms.data.json').toBeTruthy();

    await test.step('Open FLO', async () => {
      try {
        await page.goto(FLO_CONFIG.baseURL, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 30000 });
      } catch (err) { await failStep(page, 'Open FLO', err); }
    });

    const tms = new TMSPage(page);

    await test.step('Navigate to TMS', async () => {
      try {
        await tms.navigateToTMS();
      } catch (err) { await failStep(page, 'Navigate to TMS', err); }
    });

    await test.step(`Filter by Schedule Track "${scheduleTrack}"`, async () => {
      try {
        await tms.filterByScheduleTrack(scheduleTrack);
      } catch (err) { await failStep(page, 'Filter by Schedule Track', err); }
    });

    let rmPage;
    await test.step(`Click sewing job "${sewingJobNumber}" and wait for new tab`, async () => {
      try {
        rmPage = await tms.clickSewingJob(sewingJobNumber);
      } catch (err) { await failStep(page, 'Click sewing job div', err); }
    });

    await test.step('Verify "Create RM Request – Sewing Trims" page loaded', async () => {
      try {
        await tms.verifyRMRequestPage(rmPage);
      } catch (err) { await failStep(rmPage, 'Verify RM Request page', err); }
    });

    await test.step('Uncheck header select-all checkbox', async () => {
      try {
        await tms.uncheckHeaderCheckbox(rmPage);
      } catch (err) { await failStep(rmPage, 'Uncheck header checkbox', err); }
    });

    console.log(`\n✅ TMS – sewing job ${sewingJobNumber} opened successfully`);
  });

});
