// ═════════════════════════════════════════════════════════════════════════════
//  Regression – Trims Inspection (single invoice)
//  Adapted from tests/flo/trims-inspection.spec.js for the regression suite:
//    • Runs ONE invoice (from data/regression/trims-inspection.data.json)
//      instead of looping over an Excel sheet — regression checks the
//      golden path, not bulk data.
//    • Session comes from the "setup" project's stored storage state
//      (see auth.setup.js / playwright.regression.config.js) — no login step.
//
//  Run: npm run regression:headed
// ═════════════════════════════════════════════════════════════════════════════

const { test, expect }        = require('@playwright/test');
const { FLO_CONFIG }          = require('../../config/flo/credentials');
const { TrimsInspectionPage } = require('../../pages/flo/TrimsInspectionPage');
const data                    = require('../../data/regression/trims-inspection.data.json');

test.describe('Trims Inspection (Regression)', () => {

  test('Process a single invoice end-to-end', async ({ page }) => {
    test.setTimeout(600_000);

    expect(data.invoiceNumber, 'invoiceNumber must be set in trims-inspection.data.json').toBeTruthy();

    console.log('\n[Open] Navigating to FLO…');
    await page.goto(FLO_CONFIG.baseURL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const trims = new TrimsInspectionPage(page);
    const invoice = data.invoiceNumber;

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  TRIMS INSPECTION – INVOICE: ${invoice}`);
    console.log(`${'═'.repeat(50)}\n`);

    await test.step(`Inspect invoice ${invoice}`, async () => {
      await trims.navigateToSearchByInvoice();
      await trims.searchInvoice(invoice);
      await trims.verifyInvoiceInTable(invoice);
      await trims.selectInvoiceRow(invoice);
      await trims.clickCreateInspectionBatch();
      await trims.verifyBatchPage(invoice);
      await trims.clickApprovedHeader();
      await trims.clickYes();
      await trims.clickUpdate();
      await trims.verifySuccess();
      await trims.clickOK();
    });

    console.log(`\n✅ Trims inspection regression check complete for invoice ${invoice}`);
  });

});
