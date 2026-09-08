// ═════════════════════════════════════════════════════════════════════════════
//  Regression – Fabric Inspection (single invoice)
//  Adapted from tests/flo/fabric-inspection.spec.js for the regression suite:
//    • Runs ONE invoice (from data/regression/fabric-inspection.data.json)
//      instead of looping over an Excel sheet — regression checks the
//      golden path, not bulk data.
//    • Batch form-fill values (category, defect, shade group, etc.) still
//      come from config/flo/fabricInspectionData.js — FabricInspectionPage
//      reads them internally, so only the invoice number is regression data.
//    • Session comes from the "setup" project's stored storage state
//      (see auth.setup.js / playwright.regression.config.js) — no login step.
//
//  Run: npm run regression:headed
// ═════════════════════════════════════════════════════════════════════════════

const { test, expect }          = require('@playwright/test');
const { FLO_CONFIG }            = require('../../config/flo/credentials');
const { FabricInspectionPage }  = require('../../pages/flo/FabricInspectionPage');
const data                      = require('../../data/regression/fabric-inspection.data.json');

test.describe('Fabric Inspection (Regression)', () => {

  test('Process a single fabric invoice end-to-end', async ({ page }) => {
    test.setTimeout(600_000);

    expect(data.invoiceNumber, 'invoiceNumber must be set in fabric-inspection.data.json').toBeTruthy();

    console.log('\n[Open] Navigating to FLO…');
    await page.goto(FLO_CONFIG.baseURL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const fabric  = new FabricInspectionPage(page);
    const invoice = data.invoiceNumber;

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  FABRIC INSPECTION – INVOICE: ${invoice}`);
    console.log(`${'═'.repeat(50)}\n`);

    await test.step(`Inspect fabric invoice ${invoice}`, async () => {
      await fabric.navigateToFabricInspection();
      await fabric.selectSearchType();
      await fabric.searchInvoice(invoice);
      await fabric.verifyInvoiceInTable(invoice);
      await fabric.selectInvoiceRow(invoice);
      await fabric.clickCreateInspectionBatch();
      await fabric.fillCategoryAndDefect();
      await fabric.fillDetailInputs();
      await fabric.fillRemark();
      await fabric.fillShadeGroup();
      await fabric.selectShadeGroupRow();
      await fabric.clickYes();
      await fabric.fillFinalQuantities();
      await fabric.clickSave();
      await fabric.clickConfirm();
      await fabric.clickProceed();
      await fabric.verifySuccess();
      await fabric.clickOK();
      await fabric.clickBack();
    });

    console.log(`\n✅ Fabric inspection regression check complete for invoice ${invoice}`);
  });

});
