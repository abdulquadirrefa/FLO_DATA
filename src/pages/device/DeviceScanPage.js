const { buildLocators } = require('../../locators/device/DeviceScanLocators');

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

  /** Scanned count shown at the top right ("756 / 1000 Item Scanned"); NaN when not shown. */
  async getScannedCount() {
    const text = await this.scannedCounter.textContent({ timeout: 5000 }).catch(() => '');
    return parseInt((text || '').trim(), 10);
  }

  /**
   * Scans each barcode and waits for the scanned counter to go up before the next one. The app only
   * sends a scan to the server ~5s after Submit, and a barcode submitted inside that window can be lost.
   * @param {string[]} scanBarcodes
   * @param {{ timeout?: number, retries?: number }} [opts] timeout = ms to wait for the counter per scan
   * @returns {Promise<string[]>} barcodes that never registered
   */
  async scanBarcodesConfirmed(scanBarcodes, { timeout = 30000, retries = 1 } = {}) {
    if (Number.isNaN(await this.getScannedCount())) {
      throw new Error('Scanned counter ("… / … Item Scanned") not found on the device screen');
    }

    const failed = [];
    for (let i = 0; i < scanBarcodes.length; i++) {
      const barcode = scanBarcodes[i];
      let registered = false;

      for (let attempt = 0; attempt <= retries && !registered; attempt++) {
        const before = await this.getScannedCount();
        await this.submitScan(barcode);
        registered = await this.waitForScannedCount(before + 1, timeout);

        if (!registered) {
          console.log(`  ⚠️ ${barcode} not registered after ${timeout / 1000}s` + (attempt < retries ? ' — retrying' : ''));
        }
      }

      if (registered) {
        console.log(`  ✅ [${i + 1}/${scanBarcodes.length}] ${barcode} — scanned count ${await this.getScannedCount()}`);
      } else {
        failed.push(barcode);
      }
    }

    console.log(`  → ${scanBarcodes.length - failed.length}/${scanBarcodes.length} barcode(s) registered`);
    return failed;
  }

  /**
   * Scans one barcode and waits for the green success notification showing it. A consolidated barcode
   * covers every PL line, so the server can take minutes — this waits it out instead of retrying.
   * @param {string} barcode
   * @param {number} [timeout]
   */
  async scanAndWaitForSuccess(barcode, timeout = 1800000) {
    const notice  = this.page.locator('.ant-notification-notice');
    const success = notice.filter({ has: this.page.locator('.ant-notification-notice-icon-success') });
    const failure = notice.filter({ has: this.page.locator('.ant-notification-notice-icon-error, .ant-notification-notice-icon-warning') });

    // Let any earlier notification close so it is not mistaken for this scan's result
    await success.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    const started = Date.now();
    const elapsed = () => `${Math.round((Date.now() - started) / 1000)}s`;
    await this.submitScan(barcode);
    console.log(`  → Submitted ${barcode} — waiting up to ${timeout / 60000} min for the success message...`);

    let nextLog = Date.now() + 30000;
    while (Date.now() - started < timeout) {
      if (await success.first().isVisible().catch(() => false)) {
        const text = ((await success.first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        console.log(`  ✅ Scan successful after ${elapsed()} — "${text}" — scanned count ${await this.getScannedCount()}`);
        return;
      }
      if (await failure.first().isVisible().catch(() => false)) {
        const text = ((await failure.first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        throw new Error(`Device showed an error after scanning ${barcode}: ${text}`);
      }
      if (Date.now() > nextLog) {
        console.log(`  … still waiting (${elapsed()}) — scanned count ${await this.getScannedCount()}`);
        nextLog = Date.now() + 30000;
      }
      await this.page.waitForTimeout(500);
    }
    throw new Error(`No success message for ${barcode} after ${elapsed()}`);
  }

  /** @param {string} barcode */
  async submitScan(barcode) {
    await this.enterBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.enterBtn.click();
    await this.barcodeInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.barcodeInput.fill(barcode);
    await this.submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.submitBtn.click();
  }

  /**
   * @param {number} target
   * @param {number} timeout
   */
  async waitForScannedCount(target, timeout) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if ((await this.getScannedCount()) >= target) return true;
      await this.page.waitForTimeout(250);
    }
    return false;
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
