const { buildLocators } = require('../locators/DeviceScanLocators');

class DeviceScanPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  async clickStart() {
    await this.startBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.startBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Start');
  }

  /** @param {string} barcode */
  async enterStartBarcode(barcode) {
    await this.barcodeInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.barcodeInput.fill(barcode);
    console.log(`  → Start barcode entered: ${barcode}`);

    await this.submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.submitBtn.click();
    await this.page.waitForTimeout(1500);
    console.log('  → Start barcode submitted');
  }

  async waitForEntryDropdown() {
    await this.entryDropdown.waitFor({ state: 'visible', timeout: 20000 });
    console.log('  → Entry number dropdown appeared');
  }

  /**
   * @param {string[]} grnEntryNumbers
   */
  async selectAllGRNEntries(grnEntryNumbers) {
    for (const grn of grnEntryNumbers) {
      console.log(`  → Selecting GRN entry: ${grn}`);

      await this.entryDropdown.waitFor({ state: 'visible', timeout: 10000 });
      await this.entryDropdown.click();
      await this.page.waitForTimeout(1000);

      const option = this.entryOption.filter({ hasText: grn }).first();
      await option.waitFor({ state: 'visible', timeout: 10000 });
      await option.click();
      await this.page.waitForTimeout(500);
      console.log(`  ✅ GRN entry selected: ${grn}`);
    }
  }

  async clickProceed() {
    await this.proceedBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.proceedBtn.click();
    await this.page.waitForTimeout(1500);
    console.log('  → Clicked Proceed');
  }

  /**
   * @param {string[]} scanBarcodes
   */
  async enterScanBarcodes(scanBarcodes) {
    for (const barcode of scanBarcodes) {
      console.log(`  → Entering scan barcode: ${barcode}`);

      await this.enterBtn.waitFor({ state: 'visible', timeout: 15000 });
      await this.enterBtn.click();
      await this.page.waitForTimeout(1000);

      await this.barcodeInput.waitFor({ state: 'visible', timeout: 10000 });
      await this.barcodeInput.fill(barcode);

      await this.submitBtn.waitFor({ state: 'visible', timeout: 10000 });
      await this.submitBtn.click();
      await this.page.waitForTimeout(2500);
      console.log(`  ✅ Barcode submitted: ${barcode}`);
    }
  }

  async waitForScanningCompleteAndConfirm() {
    await this.page.waitForTimeout(3000);

    const isVisible = await this.okBtn.isVisible().catch(() => false);
    if (isVisible) {
      await this.okBtn.click();
      await this.page.waitForTimeout(1000);
      console.log('  ✅ Scanning complete — clicked OK');
    } else {
      console.log('  ✅ Scanning complete — no dialog appeared, continuing');
    }
  }
}

module.exports = { DeviceScanPage };
