const { buildTrimsLocators } = require('../../locators/flo/TrimsInspectionLocators');

class TrimsInspectionPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildTrimsLocators(page));
  }

  // ── Navigate to Inspection → Trims Inspection List ───────────────
  async navigateToSearchByInvoice() {
    // Click top-level "Inspection" menu item
    await this.inspectionMenuItem.waitFor({ state: 'visible', timeout: 15000 });
    await this.inspectionMenuItem.click();
    await this.page.waitForTimeout(500);

    // Click "Trims Inspection List" from the dropdown
    await this.trimsInspectionListLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.trimsInspectionListLink.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Navigated to Trims Inspection List');
  }

  // ── Search for a single invoice ───────────────────────────────────
  /** @param {string} invoice */
  async searchInvoice(invoice) {
    // Click the combobox to open it — the search input appears after click
    await this.invoiceCombobox.waitFor({ state: 'visible', timeout: 15000 });
    await this.invoiceCombobox.click();
    await this.page.waitForTimeout(400);

    // Select all existing text and replace with the new invoice number
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.type(invoice);
    await this.page.waitForTimeout(800);

    // Click the matching option from the dropdown
    const option = this.invoiceOption(invoice);
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();

    // Click Search
    await this.searchBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.searchBtn.click();
    await this.page.waitForTimeout(1500);
    console.log(`  → Searched for invoice: ${invoice}`);
  }

  // ── Verify invoice appears in results table ───────────────────────
  /** @param {string} invoice */
  async verifyInvoiceInTable(invoice) {
    await this.resultsTableBody.waitFor({ state: 'visible', timeout: 15000 });
    const text = await this.resultsTableBody.textContent();
    if (!text?.includes(invoice)) {
      throw new Error(`Invoice ${invoice} not found in results table`);
    }
    console.log(`  ✅ Invoice ${invoice} found in table`);
  }

  // ── Select the invoice row ────────────────────────────────────────
  /** @param {string} invoice */
  async selectInvoiceRow(invoice) {
    const checkbox = this.invoiceRowCheckbox(invoice);
    await checkbox.waitFor({ state: 'visible', timeout: 10000 });
    await checkbox.check();
    await this.page.waitForTimeout(500);
    console.log(`  → Row selected for invoice: ${invoice}`);
  }

  // ── Create Inspection Batch ───────────────────────────────────────
  async clickCreateInspectionBatch() {
    await this.createBatchBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.createBatchBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Create Inspection Batch');
  }

  // ── Verify batch page loaded with the invoice ─────────────────────
  /** @param {string} invoice */
  async verifyBatchPage(invoice) {
    const text = await this.mainContent.textContent({ timeout: 15000 });
    if (!text?.includes(invoice)) {
      throw new Error(`Batch page does not contain invoice ${invoice}`);
    }
    console.log(`  ✅ Batch page loaded for invoice: ${invoice}`);
  }

  // ── Select the data row checkbox ─────────────────────────────────
  async selectDataRow() {
    await this.dataRowCheckbox.waitFor({ state: 'visible', timeout: 15000 });
    await this.dataRowCheckbox.click();
    await this.page.waitForTimeout(500);
    console.log('  → Data row selected');
  }

  // ── Scroll right and click the Approved header checkbox ───────────
  async clickApprovedHeader() {
    await this.approvedHeaderCheckbox.waitFor({ state: 'visible', timeout: 15000 });
    await this.approvedHeaderCheckbox.scrollIntoViewIfNeeded();
    await this.approvedHeaderCheckbox.click();
    await this.page.waitForTimeout(500);
    console.log('  → Approved header checkbox clicked');
  }

  async clickYes() {
    await this.yesBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.yesBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Yes');
  }

  async clickUpdate() {
    // Wait for Update to become enabled after Yes is confirmed
    await this.updateBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForFunction(
      () => !document.querySelector('button[ant-click-animating-without-extra-node]') &&
            !document.querySelector('.ant-btn[disabled]')?.textContent?.includes('Update'),
      { timeout: 15000 }
    ).catch(() => {});
    await this.updateBtn.click({ timeout: 30000 });
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Update');
  }

  async verifySuccess() {
    await this.successMsg.waitFor({ state: 'visible', timeout: 20000 });
    console.log('  ✅ Success: Inspection job added');
  }

  async clickOK() {
    await this.okBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.okBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked OK');
  }
}

module.exports = { TrimsInspectionPage };
