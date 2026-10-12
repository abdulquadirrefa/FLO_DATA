const fs                = require('fs');
const path              = require('path');
const { buildLocators } = require('../../locators/grn/PLOverviewLocators');

class PLOverviewPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  async navigate() {
    await this.navLink.click();
    await this.page.waitForTimeout(3000);
    console.log('✅ Navigated to PL Overview');
  }

  /** @param {string} poNumber */
  async clickEyeIconForPO(poNumber) {
    await this.pendingSection.waitFor({ state: 'visible', timeout: 15000 });

    const card = this.pendingSection.locator('.ant-card').filter({ hasText: poNumber }).first();

    const isVisible = await card.isVisible().catch(() => false);
    if (!isVisible) {
      console.log(`  ⚠️ PO ${poNumber} not found in PENDING — skipping`);
      return;
    }

    await card.scrollIntoViewIfNeeded();
    const eyeIcon = card.locator('.anticon-eye, [aria-label="icon: eye"]').first();
    await eyeIcon.waitFor({ state: 'visible', timeout: 10000 });
    await eyeIcon.click();
    await this.page.waitForTimeout(3000);
    console.log(`  → Opened detail view for PO: ${poNumber}`);
  }

  /** Header checkbox → "Select All Pages" → Yes, so every PL line is selected. */
  async selectAllLinesAllPages() {
    await this.headerCheckbox.waitFor({ state: 'visible', timeout: 15000 });
    await this.headerCheckbox.click();

    // The Confirm Selection dialog only appears when the lines span more than one page
    const hasDialog = await this.selectAllPagesBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
    if (hasDialog) {
      await this.selectAllPagesBtn.click();
      console.log('  → Clicked "Select All Pages"');
      await this.confirmYesBtn.waitFor({ state: 'visible', timeout: 10000 });
      await this.confirmYesBtn.click();
      console.log('  → Confirmed Yes');
    } else {
      console.log('  → No selection dialog (single page) — all lines selected');
    }

    await this.page.waitForTimeout(1000);
    const label = ((await this.selectedLabel.textContent({ timeout: 10000 }).catch(() => '')) || '').trim();
    if (!label || /^0 /.test(label)) throw new Error(`No PL lines selected (label: "${label}")`);
    console.log(`  → ${label}`);
  }

  /**
   * PRINT → Barcode Type "Consolidated Barcode" → Confirm, then waits for the barcode file to finish
   * downloading (one barcode is generated for all selected lines — slow for large PLs) and saves it.
   * @param {{ timeout?: number, saveDir: string, filePrefix: string }} opts
   */
  async printConsolidatedBarcode({ timeout = 600000, saveDir, filePrefix }) {
    await this.printBtn.waitFor({ state: 'visible', timeout: 15000 });
    if (await this.printBtn.isDisabled()) throw new Error('PRINT is disabled — no lines selected');
    await this.printBtn.click();

    await this.printModal.waitFor({ state: 'visible', timeout: 15000 });
    await this.printModal.locator('.ant-select').first().click();
    await this.selectOption.filter({ hasText: 'Consolidated Barcode' }).first().click();

    const chosen = ((await this.printModal.locator('.ant-select-selection-selected-value').first().textContent()) || '').trim();
    if (chosen !== 'Consolidated Barcode') throw new Error(`Barcode Type shows "${chosen}", expected "Consolidated Barcode"`);
    console.log('  → Barcode Type: Consolidated Barcode');

    const started  = Date.now();
    const elapsed  = () => `${Math.round((Date.now() - started) / 1000)}s`;
    const download = this.waitForDownload(timeout);   // listen before clicking
    await this.printModal.locator('button:has-text("Confirm")').click();
    console.log(`  → Clicked Confirm — waiting up to ${timeout / 60000} min for the barcode file to download...`);

    const file = await download;
    const failure = await file.failure();
    if (failure) throw new Error(`Barcode file download failed: ${failure}`);

    const target = path.join(saveDir, `${filePrefix}-${file.suggestedFilename()}`);
    fs.mkdirSync(saveDir, { recursive: true });
    await file.saveAs(target);                         // resolves once the download has finished
    const sizeKB = (fs.statSync(target).size / 1024).toFixed(1);
    console.log(`  ✅ Consolidated barcode downloaded after ${elapsed()} (${sizeKB} KB) → ${target}`);

    await this.printModal.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    await this.loadingSpinner.first().waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
  }

  /**
   * Resolves with the next download from this page or from a tab it opens.
   * @param {number} timeout
   * @returns {Promise<import('@playwright/test').Download>}
   */
  waitForDownload(timeout) {
    const context = this.page.context();
    return new Promise((resolve, reject) => {
      const timer  = setTimeout(() => { cleanup(); reject(new Error(`No barcode file downloaded within ${timeout / 1000}s`)); }, timeout);
      const done   = d => { cleanup(); resolve(d); };
      const onPage = p => p.once('download', done);
      const cleanup = () => {
        clearTimeout(timer);
        this.page.off('download', done);
        context.off('page', onPage);
      };
      this.page.once('download', done);
      context.on('page', onPage);
    });
  }

  async clickMarkAsInHouse() {
    await this.markInHouseBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Mark as In-House');
  }

  async confirmAlertYes() {
    await this.confirmYesBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.confirmYesBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Confirmed Yes');
  }

  async selectAutoGenerateEntryNo() {
    await this.dialog.waitFor({ state: 'visible', timeout: 15000 });

    await this.dialog.locator('.ant-select-selection').first().click();
    await this.page.waitForTimeout(1000);

    await this.autoGenOption.waitFor({ state: 'visible', timeout: 10000 });
    await this.autoGenOption.click();
    await this.page.waitForTimeout(500);

    await this.dialog.locator('button:has-text("Ok"), button:has-text("OK")').first().click();
    await this.page.waitForTimeout(3000);
    console.log('  → Selected Auto Generate and clicked Ok');
  }

  /** @param {number} [timeout] */
  async waitForMarkAsPendingButton(timeout = 30000) {
    await this.page.waitForSelector(this.markPendingBtn, { timeout });
    console.log('  ✅ Mark as Pending button appeared — In-House complete');
  }

  async clickBack() {
    await this.backBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked BACK');
  }
}

module.exports = { PLOverviewPage };
