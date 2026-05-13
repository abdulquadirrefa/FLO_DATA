require('dotenv').config();
const { test, expect }         = require('@playwright/test');
const { FloLoginPage }         = require('../../pages/flo/FloLoginPage');
const { TrimsInspectionPage }  = require('../../pages/flo/TrimsInspectionPage');
const { FLO_CONFIG }           = require('../../config/flo/credentials');
const { readInvoiceNumbers }   = require('../../config/flo/readInvoiceNumbers');

const invoiceNumbers = readInvoiceNumbers();

test.describe('Trims Inspection', () => {

  test('Process all invoices from Excel sheet', async ({ page }) => {
    test.setTimeout(0);

    expect(invoiceNumbers.length, 'No invoice numbers found in Excel').toBeGreaterThan(0);

    // ── Login ───────────────────────────────────────────────────────
    const floLogin = new FloLoginPage(page);
    await floLogin.goto(FLO_CONFIG.baseURL);
    await floLogin.login(FLO_CONFIG.email, FLO_CONFIG.password);
    console.log('✅ Login complete');

    const trims = new TrimsInspectionPage(page);

    const failed = [];

    // ── Process each invoice one by one ────────────────────────────
    for (let i = 0; i < invoiceNumbers.length; i++) {
      const invoice = invoiceNumbers[i];

      console.log(`\n${'═'.repeat(50)}`);
      console.log(`  INVOICE ${i + 1}/${invoiceNumbers.length}: ${invoice}`);
      console.log(`${'═'.repeat(50)}\n`);

      try {
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
        console.log(`\n✅ Invoice ${invoice} inspection complete`);
      } catch (err) {
        console.error(`\n❌ Invoice ${invoice} FAILED: ${err.message}`);
        failed.push(invoice);
        await page.keyboard.press('Escape').catch(() => {});
      }
    }

    // ── Final summary ───────────────────────────────────────────────
    console.log('\n\n════════════════════════════════════════');
    if (failed.length === 0) {
      console.log('🎉 All invoices processed successfully!');
    } else {
      console.log(`⚠️  ${invoiceNumbers.length - failed.length}/${invoiceNumbers.length} invoices succeeded.`);
      console.log(`❌  Failed invoices: ${failed.join(', ')}`);
    }
    console.log('════════════════════════════════════════');
  });

});
