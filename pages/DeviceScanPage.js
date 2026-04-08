class DeviceScanPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async clickStart() {
    const startBtn = this.page.locator('button.ant-btn-primary.ant-btn-lg:has-text("Start")').first();
    await startBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Start');
  }

  /** @param {string} barcode */
  async enterStartBarcode(barcode) {
    // Enter Barcode dialog input
    const barcodeInput = this.page.locator('input[type="text"]').first();
    await barcodeInput.waitFor({ state: 'visible', timeout: 15000 });
    await barcodeInput.fill(barcode);
    console.log(`  → Start barcode entered: ${barcode}`);

    // Click Submit in the dialog
    const submitBtn = this.page.locator('a.am-modal-button[role="button"]:has-text("Submit")').first();
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click();
    await this.page.waitForTimeout(1500);
    console.log('  → Start barcode submitted');
  }

  async waitForEntryDropdown() {
    const dropdown = this.page.locator('.ant-select-selection--single').first();
    await dropdown.waitFor({ state: 'visible', timeout: 20000 });
    console.log('  → Entry number dropdown appeared');
  }

  /**
   * Selects all GRN entry numbers one by one from the dropdown
   * @param {string[]} grnEntryNumbers
   */
  async selectAllGRNEntries(grnEntryNumbers) {
    for (const grn of grnEntryNumbers) {
      console.log(`  → Selecting GRN entry: ${grn}`);

      // Open dropdown
      const dropdown = this.page.locator('.ant-select-selection--single').first();
      await dropdown.waitFor({ state: 'visible', timeout: 10000 });
      await dropdown.click();
      await this.page.waitForTimeout(1000);

      // Select matching option
      const option = this.page
        .locator('.ant-select-dropdown-menu-item')
        .filter({ hasText: grn })
        .first();
      await option.waitFor({ state: 'visible', timeout: 10000 });
      await option.click();
      await this.page.waitForTimeout(500);
      console.log(`  ✅ GRN entry selected: ${grn}`);
    }
  }

  async clickProceed() {
    const proceedBtn = this.page
      .locator('button.antd-pro-app-src-pages-device-index-bottomBarButton:has-text("Proceed")')
      .first();
    await proceedBtn.waitFor({ state: 'visible', timeout: 15000 });
    await proceedBtn.click();
    await this.page.waitForTimeout(1500);
    console.log('  → Clicked Proceed');
  }

  /**
   * Enters all scan barcodes one by one using the Enter button
   * @param {string[]} scanBarcodes
   */
  async enterScanBarcodes(scanBarcodes) {
    for (const barcode of scanBarcodes) {
      console.log(`  → Entering scan barcode: ${barcode}`);

      // Click the Enter button (barcode icon button)
      const enterBtn = this.page
        .locator('button.antd-pro-app-src-pages-device-index-enterButton')
        .first();
      await enterBtn.waitFor({ state: 'visible', timeout: 15000 });
      await enterBtn.click();
      await this.page.waitForTimeout(1000);

      // Fill barcode in dialog
      const barcodeInput = this.page.locator('input[type="text"]').first();
      await barcodeInput.waitFor({ state: 'visible', timeout: 10000 });
      await barcodeInput.fill(barcode);

      // Click Submit
      const submitBtn = this.page
        .locator('a.am-modal-button[role="button"]:has-text("Submit")')
        .first();
      await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
      await submitBtn.click();
      await this.page.waitForTimeout(2500);
      console.log(`  ✅ Barcode submitted: ${barcode}`);
    }
  }

async waitForScanningCompleteAndConfirm() {
  // Wait longer after last barcode submission before checking for dialog
  await this.page.waitForTimeout(3000);

  // Try multiple possible dialog button texts
  const okBtn = this.page.locator(
    'a.am-modal-button[role="button"]:has-text("OK"), ' +
    'a.am-modal-button[role="button"]:has-text("Ok"), ' +
    'a.am-modal-button[role="button"]:has-text("ok"), ' +
    '.am-modal-button:has-text("OK"), ' +
    '.am-modal-button:has-text("Ok"), ' +
    'button:has-text("OK"), ' +
    'button:has-text("Ok")'
  ).first();

  // Check if dialog appeared — if not, scanning may have auto-completed
  const isVisible = await okBtn.isVisible().catch(() => false);
  if (isVisible) {
    await okBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  ✅ Scanning complete — clicked OK');
  } else {
    console.log('  ✅ Scanning complete — no dialog appeared, continuing');
  }
}
}

module.exports = { DeviceScanPage };