class PLCreationPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async navigateToPLCreation() {
    await this.page.locator('a[href="/raw-material/delivery/pl-upload"]:has-text("PL Creation")').first().click();
    await this.page.waitForTimeout(2000);
    console.log('✅ Navigated to PL Creation');
  }

  /** @param {string} poNumber */
  async enterPONumber(poNumber) {
    const poInput = this.page
      .locator('#poNo, input[placeholder="Enter Valid PO number to create a PL"]')
      .first();
    await poInput.waitFor({ state: 'visible', timeout: 15000 });
    await poInput.click();
    await poInput.fill(poNumber);
    await this.page.waitForTimeout(500);
    console.log(`  → PO number entered: ${poNumber}`);
  }

  async clickNext() {
    await this.page.locator('button:has-text("Next")').first().click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Next');
  }

  async clickCreatePackingList() {
    await this.page
      .locator('button.ant-btn-primary:has-text("Create Packing List")')
      .first()
      .click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Create Packing List');
  }

  /** @param {string} poNumber */
  async fillPackingListForm(poNumber) {
    const packingListInput = this.page.locator('input[placeholder="Packing List No"]').first();
    await packingListInput.waitFor({ state: 'visible', timeout: 15000 });
    await packingListInput.fill(poNumber);

    await this.page.locator('input[placeholder="Invoice No"]').first().fill(poNumber);
    await this.page.locator('input[placeholder="Cusdec Number"]').first().fill(poNumber);
    console.log('  → Packing List form filled');
  }

   async clickAutoPopulateOrderQuantity() {
    const btn = this.page
      .locator('button.ant-btn-primary:has-text("Auto Populate Order Quantity")')
      .first();
    await btn.waitFor({ state: 'visible', timeout: 15000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Auto Populate Order Quantity');
  }

  async confirmAlertYes() {
    const yesBtn = this.page
      .locator('.ant-popover-buttons button:has-text("Yes"), .ant-popconfirm-buttons button:has-text("Yes"), button.ant-btn-primary:has-text("Yes")')
      .first();
    await yesBtn.waitFor({ state: 'visible', timeout: 10000 });
    await yesBtn.click();
    console.log('  → Confirmed Yes on alert');
  }

 async fillSpreadsheetColumns() {
  const drawer = this.page.locator('.ant-drawer-content').first();
  await drawer.waitFor({ state: 'visible', timeout: 15000 });

  const spreadsheet = drawer.locator('.Spreadsheet__table').first();
  await spreadsheet.waitFor({ state: 'visible', timeout: 15000 });

  // Headers are in tbody tr:first-child — skip it, get only data rows
  const headers = drawer.locator('.Spreadsheet__table tbody tr:first-child th.Spreadsheet__header');
  const headerCount = await headers.count();

  let batchNoColIndex = -1;
  let supplierPackageIDColIndex = -1;

  for (let i = 0; i < headerCount; i++) {
    const text = await headers.nth(i).innerText();
    if (text.trim() === 'Batch No') batchNoColIndex = i;
    if (text.trim() === 'Supplier Package ID') supplierPackageIDColIndex = i;
  }

  console.log(`  → Batch No col: ${batchNoColIndex}, Supplier Package ID col: ${supplierPackageIDColIndex}`);

  // Data rows only — skip the first tr (header row)
  const rows = drawer.locator('.Spreadsheet__table tbody tr[row]');
  const rowCount = await rows.count();
  console.log(`  → ${rowCount} actual data row(s) found`);

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const batchValue    = `BN_${String(rowIdx + 1).padStart(3, '0')}`;
    const supplierValue = `SP_${String(rowIdx + 1).padStart(3, '0')}`;

    // 1. Double-click Batch No cell to activate it
    const batchCell = rows.nth(rowIdx).locator('td.Spreadsheet__cell:not(.Spreadsheet__cell--readonly)').nth(0);
    await batchCell.scrollIntoViewIfNeeded();
    await batchCell.dblclick();
    await this.page.waitForTimeout(300);
    await this.page.keyboard.type(batchValue);
    console.log(`    Row ${rowIdx + 1}: Batch=${batchValue} typed`);

    // 2. Tab moves focus directly to Supplier Package ID — just type, no click needed
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(300);
    await this.page.keyboard.type(supplierValue);
    console.log(`    Row ${rowIdx + 1}: SupplierPkg=${supplierValue} typed`);

    // 3. Tab out to confirm and move to next row
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(300);
  }
}

 

  async clickSave() {
    await this.page
      .locator('button:has-text("Save"):not(:has-text("Save Changes"))')
      .first()
      .click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Save');
  }

  async clickSaveChanges() {
    await this.page.locator('button:has-text("Save Changes")').first().click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Save Changes');
  }

  async clickSubmit() {
    await this.page.locator('button:has-text("Submit")').first().click();
    await this.page.waitForTimeout(3000);
    console.log('  → Clicked Submit');
  }

  async waitForSuccessMessage() {
    await this.page
      .locator('.ant-result-title:has-text("File uploaded Successfully")')
      .first()
      .waitFor({ state: 'visible', timeout: 20000 });
    console.log('  ✅ Upload successful!');
  }

  async clickUploadAnotherPackingList() {
    await this.page.locator('button:has-text("Upload Another Packing List")').first().click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Upload Another Packing List');
  }
}

module.exports = { PLCreationPage };