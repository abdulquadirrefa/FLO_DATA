class InventoryViewPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    // Click Inventory submenu to expand
    await this.page
      .locator('.ant-menu-submenu-title:has-text("Inventory")')
      .first()
      .click();
    await this.page.waitForTimeout(1000);

    // Click Inventory View
    await this.page
      .locator('a[href="/raw-material/inventory/inventory-view"]:has-text("Inventory View")')
      .first()
      .click();
    await this.page.waitForTimeout(3000);
    console.log('✅ Navigated to Inventory View');
  }

  async enablePONumberColumn() {
    // Click settings icon
    await this.page.locator('.anticon-setting.ant-dropdown-trigger').first().click();
    await this.page.waitForTimeout(1000);

    const poCheckbox = this.page.locator('#purchaseOrderNumber').first();
    await poCheckbox.waitFor({ state: 'visible', timeout: 10000 });

    const isChecked = await poCheckbox.isChecked();
    if (!isChecked) {
      await poCheckbox.click();
      console.log('  ✅ PO Number column enabled');
    } else {
      console.log('  ✅ PO Number column already enabled');
    }

    // Click the settings icon again to close the dropdown
  await this.page.locator('.anticon-setting.ant-dropdown-trigger').first().click();
  await this.page.waitForTimeout(500);
  }

  /** @param {string} poNumber */
  async searchByPONumber(poNumber) {
    const searchInput = this.page
      .locator('#advanced_search_purchaseOrderNumber, input[placeholder="Enter a PO Number"]')
      .first();
    await searchInput.waitFor({ state: 'visible', timeout: 15000 });
    await searchInput.clear();
    await searchInput.fill(poNumber);

    await this.page.locator('button[type="submit"]:has-text("Search")').first().click();
    await this.page.waitForTimeout(3000);
    await this.page.waitForSelector('.ant-table-row', { timeout: 20000 });
    console.log(`  → Search complete for PO: ${poNumber}`);
  }

  /**
   * Collects GRN Entry Number and Scan Barcode from all result rows
   * @param {string} poNumber
   * @returns {Promise<{ poNumber: string, grnEntryNumber: string, scanBarcode: string }[]>}
   */
  async collectRowData(poNumber) {
  /** @type {{ poNumber: string, grnEntryNumber: string, scanBarcode: string }[]} */
  const results = [];

  const tableHeaders = this.page.locator('th.ant-table-row-cell-break-word .ant-table-column-title');
  const headerCount  = await tableHeaders.count();

  let grnColIndex     = -1;
  let barcodeColIndex = -1;

  for (let i = 0; i < headerCount; i++) {
    const text = await tableHeaders.nth(i).innerText();
    if (text.trim() === 'GRN Entry Number') grnColIndex = i;
    if (text.trim() === 'Scan Barcode')     barcodeColIndex = i;
  }

  console.log(`  → GRN col index: ${grnColIndex}, Barcode col index: ${barcodeColIndex}`);

  // Use :not(.ant-table-fixed-columns-in-body) to avoid duplicate fixed-column rows
  const tableRows = this.page.locator(
    '.ant-table-row.ant-table-row-level-0:not(.ant-table-fixed-row)'
  );
  const rowCount = await tableRows.count();
  console.log(`  → ${rowCount} row(s) found`);

  for (let r = 0; r < rowCount; r++) {
    const cells = tableRows.nth(r).locator('td.ant-table-row-cell-break-word');
    const cellCount = await cells.count();

    // Skip rows that don't have enough cells (fixed column ghost rows)
    if (cellCount < grnColIndex + 1) {
      console.log(`    ⚠️ Row ${r + 1} skipped — only ${cellCount} cells`);
      continue;
    }

    const grnValue     = grnColIndex >= 0     ? (await cells.nth(grnColIndex).innerText()).trim()     : '';
    const barcodeValue = barcodeColIndex >= 0 ? (await cells.nth(barcodeColIndex).innerText()).trim() : '';

    results.push({ poNumber, grnEntryNumber: grnValue, scanBarcode: barcodeValue });
    console.log(`    📌 Row ${r + 1} — GRN: ${grnValue} | Barcode: ${barcodeValue}`);
  }

  return results;
}
}

module.exports = { InventoryViewPage };