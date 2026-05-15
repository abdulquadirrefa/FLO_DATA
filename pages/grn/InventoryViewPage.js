const { buildLocators } = require('../../locators/grn/InventoryViewLocators');

class InventoryViewPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  async navigate() {
    await this.inventorySubmenu.click();
    await this.page.waitForTimeout(1000);

    await this.inventoryViewLink.click();
    await this.page.waitForTimeout(3000);
    console.log('✅ Navigated to Inventory View');
  }

  async enablePONumberColumn() {
    await this.settingsIcon.click();
    await this.page.waitForTimeout(1000);

    await this.poNumberCheckbox.waitFor({ state: 'visible', timeout: 10000 });

    const isChecked = await this.poNumberCheckbox.isChecked();
    if (!isChecked) {
      await this.poNumberCheckbox.click();
      console.log('  ✅ PO Number column enabled');
    } else {
      console.log('  ✅ PO Number column already enabled');
    }

    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(300);
    await this.settingsIcon.click();
    await this.page.waitForTimeout(500);
  }

  /** @param {string} poNumber */
  async searchByPONumber(poNumber) {
    await this.searchInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.searchInput.clear();
    await this.searchInput.fill(poNumber);

    await this.searchBtn.click();
    await this.page.waitForTimeout(3000);
    await this.page.waitForSelector(this.tableRow, { timeout: 20000 });
    console.log(`  → Search complete for PO: ${poNumber}`);
  }

  /**
   * @param {string} poNumber
   * @returns {Promise<{ poNumber: string, grnEntryNumber: string, scanBarcode: string }[]>}
   */
  async collectRowData(poNumber) {
    const results = [];

    // Resolve column indices once from the header row
    const headerCount = await this.tableHeaders.count();
    let grnColIndex     = -1;
    let barcodeColIndex = -1;

    for (let i = 0; i < headerCount; i++) {
      const text = await this.tableHeaders.nth(i).innerText();
      if (text.trim() === 'GRN Entry Number') grnColIndex = i;
      if (text.trim() === 'Scan Barcode')     barcodeColIndex = i;
    }

    console.log(`  → GRN col index: ${grnColIndex}, Barcode col index: ${barcodeColIndex}`);

    let pageNum = 1;

    while (true) {
      console.log(`  → Reading page ${pageNum}...`);

      const rowCount = await this.tableRows.count();
      console.log(`     ${rowCount} row(s) on this page`);

      for (let r = 0; r < rowCount; r++) {
        const cells     = this.tableRows.nth(r).locator('td.ant-table-row-cell-break-word');
        const cellCount = await cells.count();

        if (cellCount < grnColIndex + 1) {
          console.log(`    ⚠️ Row ${r + 1} skipped — only ${cellCount} cells`);
          continue;
        }

        const grnValue     = grnColIndex >= 0     ? (await cells.nth(grnColIndex).innerText()).trim()     : '';
        const barcodeValue = barcodeColIndex >= 0 ? (await cells.nth(barcodeColIndex).innerText()).trim() : '';

        results.push({ poNumber, grnEntryNumber: grnValue, scanBarcode: barcodeValue });
        console.log(`    📌 Row ${r + 1} — GRN: ${grnValue} | Barcode: ${barcodeValue}`);
      }

      // Check if pagination exists and next page is available
      const hasPagination = await this.pagination.isVisible();
      if (!hasPagination) break;

      const nextDisabled = await this.nextPageBtn.getAttribute('aria-disabled');
      if (nextDisabled === 'true') break;

      // Navigate to next page and wait for table to re-render
      await this.nextPageBtn.click();
      await this.page.waitForTimeout(2000);
      await this.page.waitForSelector(this.tableRow, { timeout: 15000 });

      pageNum++;
    }

    console.log(`  → Total rows collected for PO ${poNumber}: ${results.length}`);
    return results;
  }
}

module.exports = { InventoryViewPage };
