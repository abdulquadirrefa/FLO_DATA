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

  /**
   * Reads page 1 only — with a consolidated barcode every line of the PO ends up sharing one
   * Scan Barcode and GRN Entry Number, so there is no need to page through the rest.
   * The app rewrites the per-line barcodes slowly, so check `barcodes.length === 1` before using it.
   * @param {string} poNumber
   * @returns {Promise<{ poNumber: string, grnEntryNumber: string, scanBarcode: string, barcodes: string[], grns: string[], rowCount: number } | null>}
   */
  async readConsolidatedRow(poNumber) {
    const headers = (await this.tableHeaders.allTextContents()).map(t => t.trim());
    const cols    = ['Scan Barcode', 'GRN Entry Number'].map(name => headers.indexOf(name));
    if (cols.some(i => i < 0)) throw new Error('Inventory View column(s) not found: Scan Barcode / GRN Entry Number');

    const rows = (await this.tableRows.evaluateAll((trs, idx) => trs
      .filter(tr => !tr.closest('.ant-table-fixed-left, .ant-table-fixed-right'))   // fixed-column copies
      .map(tr => {
        const tds = tr.querySelectorAll('td.ant-table-row-cell-break-word');
        return idx.map(i => ((tds[i] && tds[i].textContent) || '').trim());
      }), cols)).filter(([barcode]) => barcode);

    if (!rows.length) return null;

    const barcodes = [...new Set(rows.map(([barcode]) => barcode))];
    const grns     = [...new Set(rows.map(([, grn]) => grn).filter(Boolean))];   // goes blank once consolidated
    const [scanBarcode, grnEntryNumber] = rows[0];
    return { poNumber, grnEntryNumber, scanBarcode, barcodes, grns, rowCount: rows.length };
  }

  /**
   * Reads every row for the PO across all pages with its scan state. A row scanned on the device
   * gets a Location Name (the start-barcode location, e.g. LOC-100262); unscanned rows have none.
   * @param {string} poNumber
   * @param {{ maxPages?: number }} [opts] stop after this many pages (default: all)
   * @returns {Promise<{ poNumber: string, grnEntryNumber: string, scanBarcode: string, batchNo: string, locationName: string, docDate: string }[]>}
   */
  async collectScanStatus(poNumber, { maxPages = Infinity } = {}) {
    const headers = (await this.tableHeaders.allTextContents()).map(t => t.trim());
    const names   = ['Scan Barcode', 'GRN Entry Number', 'Batch Number', 'Location Name', 'Doc Date'];
    const cols    = names.map(name => headers.indexOf(name));
    const missing = names.filter((_, i) => cols[i] < 0);
    if (missing.length) throw new Error(`Inventory View column(s) not found: ${missing.join(', ')}`);

    const firstBarcode = async () => ((await this.tableRows.first()
      .locator('td.ant-table-row-cell-break-word').nth(cols[0]).textContent().catch(() => '')) || '').trim();

    const results = [];
    for (let pageNum = 1; ; pageNum++) {
      // One round-trip per page. The fixed "Actions" columns are drawn as a second copy of every
      // row inside .ant-table-fixed-left/right — skip those copies.
      const rows = await this.tableRows.evaluateAll((trs, idx) => trs
        .filter(tr => !tr.closest('.ant-table-fixed-left, .ant-table-fixed-right'))
        .map(tr => {
          const tds = tr.querySelectorAll('td.ant-table-row-cell-break-word');
          return idx.map(i => ((tds[i] && tds[i].textContent) || '').trim());
        }), cols);

      for (const [scanBarcode, grnEntryNumber, batchNo, locationName, docDate] of rows) {
        if (!scanBarcode) continue;
        results.push({ poNumber, grnEntryNumber, scanBarcode, batchNo, locationName, docDate });
      }
      if (pageNum % 10 === 0) console.log(`  → Read ${pageNum} page(s), ${results.length} row(s)...`);

      if (pageNum >= maxPages) break;
      if (!(await this.pagination.isVisible())) break;
      if ((await this.nextPageBtn.getAttribute('aria-disabled')) === 'true') break;

      // Next page — wait until the table actually shows different rows
      const before = await firstBarcode();
      await this.nextPageBtn.click();
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        await this.page.waitForTimeout(300);
        const now = await firstBarcode();
        if (now && now !== before) break;
      }
    }

    console.log(`  → Total rows read for PO ${poNumber}: ${results.length}`);
    return results;
  }
}

module.exports = { InventoryViewPage };
