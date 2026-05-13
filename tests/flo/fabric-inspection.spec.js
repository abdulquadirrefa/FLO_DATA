require('dotenv').config();
const { test, expect }              = require('@playwright/test');
const { FloLoginPage }              = require('../../pages/flo/FloLoginPage');
const { FabricInspectionPage }      = require('../../pages/flo/FabricInspectionPage');
const { FLO_CONFIG }                = require('../../config/flo/credentials');
const { readFabricInvoiceNumbers }  = require('../../config/flo/readFabricInvoiceNumbers');

const invoiceNumbers = readFabricInvoiceNumbers();

test.describe('Fabric Inspection', () => {

  test('Process all fabric invoices from Excel sheet', async ({ page }) => {
    test.setTimeout(0);

    expect(invoiceNumbers.length, 'No invoice numbers found in Excel').toBeGreaterThan(0);

    // ── Login ───────────────────────────────────────────────────────
    const floLogin = new FloLoginPage(page);
    await floLogin.goto(FLO_CONFIG.baseURL);
    await floLogin.login(FLO_CONFIG.email, FLO_CONFIG.password);
    console.log('✅ Login complete');

    const fabric = new FabricInspectionPage(page);
    const failed = [];

    // ── Process each invoice ────────────────────────────────────────
    for (let i = 0; i < invoiceNumbers.length; i++) {
      const invoice = invoiceNumbers[i];

      console.log(`\n${'═'.repeat(50)}`);
      console.log(`  INVOICE ${i + 1}/${invoiceNumbers.length}: ${invoice}`);
      console.log(`${'═'.repeat(50)}\n`);

      try {
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

        console.log(`\n✅ Invoice ${invoice} fabric inspection complete`);
      } catch (err) {
        console.error(`\n❌ Invoice ${invoice} FAILED: ${err.message}`);
        failed.push(invoice);
        await page.keyboard.press('Escape').catch(() => {});
      }
    }

    // ── Final summary ───────────────────────────────────────────────
    console.log('\n\n════════════════════════════════════════');
    if (failed.length === 0) {
      console.log('🎉 All fabric invoices processed successfully!');
    } else {
      console.log(`⚠️  ${invoiceNumbers.length - failed.length}/${invoiceNumbers.length} invoices succeeded.`);
      console.log(`❌  Failed invoices: ${failed.join(', ')}`);
    }
    console.log('════════════════════════════════════════');
  });

});
