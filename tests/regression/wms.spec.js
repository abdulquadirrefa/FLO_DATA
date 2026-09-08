// ═════════════════════════════════════════════════════════════════════════════
//  Regression – WMS (Warehouse Management System)
//
//    • WMS lives inside the FLO app, so the regression "setup" project's
//      stored session (see auth.setup.js / playwright.regression.config.js)
//      already authenticates these tests — no login step needed.
//    • Test data lives in data/regression/wms.data.json.
//    • Follow the POM pattern: keep selectors in locators/flo/WMSLocators.js
//      and flow steps as methods on pages/flo/WMSPage.js.
//
//  Run: npm run regression:headed
// ═════════════════════════════════════════════════════════════════════════════

const { test, expect } = require('@playwright/test');
const { FLO_CONFIG }   = require('../../config/flo/credentials');
const { WMSPage }      = require('../../pages/flo/WMSPage');
const data             = require('../../data/regression/wms.data.json');

// ── Screenshot helper – attaches to the Playwright HTML report ────────────────
async function failStep(page, stepName, err) {
  console.error(`\n[FAIL] ${stepName}: ${err.message}`);
  const screenshot = await page.screenshot({ fullPage: true });
  await test.info().attach(`FAIL – ${stepName}`, {
    body:        screenshot,
    contentType: 'image/png',
  });
  throw err;
}

test.describe('WMS (Regression)', () => {

  test('Production Requests', async ({ page }) => {
    test.setTimeout(1_800_000);

    const { requestCategory, scheduleNumber, selectionAction } = data.productionRequests;
    expect(scheduleNumber, 'Set productionRequests.scheduleNumber in wms.data.json').toBeTruthy();

    await test.step('Open FLO', async () => {
      try {
        await page.goto(FLO_CONFIG.baseURL, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 30000 });
      } catch (err) { await failStep(page, 'Open FLO', err); }
    });

    const wms = new WMSPage(page);

    await test.step('Navigate to WMS → Warehouse Requests → Production Requests', async () => {
      try {
        await wms.navigateToProductionRequests();
      } catch (err) { await failStep(page, 'Navigate to Production Requests', err); }
    });

    await test.step('Verify "Request Category:" label is displayed', async () => {
      try {
        await wms.verifyRequestCategoryLabelVisible();
      } catch (err) { await failStep(page, 'Verify Request Category label', err); }
    });

    await test.step(`Filter by Request Category "${requestCategory}" and Schedule "${scheduleNumber}"`, async () => {
      try {
        await wms.selectRequestCategory(requestCategory);
        await wms.fillSchedule(scheduleNumber);
        await wms.clickSearch();
      } catch (err) { await failStep(page, 'Filter Production Requests', err); }
    });

    await test.step(`Verify schedule ${scheduleNumber} status is "Requested"`, async () => {
      try {
        await wms.verifyStatusRequested(scheduleNumber);
      } catch (err) { await failStep(page, 'Verify status Requested', err); }
    });

    await test.step(`Select "${selectionAction}" and click Proceed`, async () => {
      try {
        await wms.selectActionAndProceed(scheduleNumber, selectionAction);
        await wms.waitForAllocationMethod();
      } catch (err) { await failStep(page, 'Select action and Proceed', err); }
    });

    let rowCount = 0;
    await test.step('Determine Allocation table row count', async () => {
      try {
        rowCount = await wms.getAllocationRowCount();
      } catch (err) { await failStep(page, 'Determine Allocation row count', err); }
    });

    // Process every row on the Allocation page. After confirming a row's
    // allocation, the app returns to Production Requests with the same
    // search results loaded — re-verify status, then re-enter Allocation
    // for the next row.
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const rowLabel = `Row ${rowIndex + 1}/${rowCount}`;

      await test.step(`${rowLabel} – Select row and click Manual`, async () => {
        try {
          await wms.selectAllocationRowIfEnabled(rowIndex);
          await wms.clickManualIfEnabled();
        } catch (err) { await failStep(page, `${rowLabel} – select row & Manual`, err); }
      });

      await test.step(`${rowLabel} – Verify Manual Allocate Trims page and load detail table`, async () => {
        try {
          await wms.verifyManualAllocateTrimsHeading();
          await wms.verifyScheduleOnManualPage(scheduleNumber);
          await wms.clickDownSquareButton();
          await wms.waitForManualAllocateTable();
        } catch (err) { await failStep(page, `${rowLabel} – Manual Allocate Trims page load`, err); }
      });

      await test.step(`${rowLabel} – Allocate lot-rows until balance achieved (last → first)`, async () => {
        try {
          await wms.performManualAllocation();
        } catch (err) { await failStep(page, `${rowLabel} – manual allocation loop`, err); }
      });

      await test.step(`${rowLabel} – Confirm allocation and dismiss dialog`, async () => {
        try {
          await wms.clickConfirm();
          await wms.handleConfirmDialog();
        } catch (err) { await failStep(page, `${rowLabel} – confirm allocation`, err); }
      });

      if (rowIndex + 1 < rowCount) {
        await test.step(`${rowLabel} – Verify status "Partially Allocated"`, async () => {
          try {
            await wms.verifyStatusPartiallyAllocated(scheduleNumber);
          } catch (err) { await failStep(page, `${rowLabel} – verify Partially Allocated`, err); }
        });

        await test.step(`${rowLabel} – Re-select "${selectionAction}" and click Proceed for next row`, async () => {
          try {
            await wms.selectActionAndProceed(scheduleNumber, selectionAction);
            await wms.waitForAllocationMethod();
          } catch (err) { await failStep(page, `${rowLabel} – re-select action and Proceed`, err); }
        });
      }
    }

    console.log(`\n✅ WMS Production Requests – completed allocation for ${rowCount} row(s), schedule ${scheduleNumber}`);
  });

});
