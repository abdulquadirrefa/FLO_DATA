const { buildLocators } = require('../../locators/m3/PLCreationLocators');

class PLCreationPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  async navigateToPLCreation() {
    await this.navLink.click();
    await this.page.waitForTimeout(2000);
    console.log('✅ Navigated to PL Creation');
  }

  /** @param {string} poNumber */
  async enterPONumber(poNumber) {
    await this.poInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.poInput.click();
    await this.poInput.fill(poNumber);
    await this.page.waitForTimeout(500);
    console.log(`  → PO number entered: ${poNumber}`);
  }

  async clickNext() {
    await this.nextBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Next');
  }

  async clickCreatePackingList() {
    await this.createPackingListBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Create Packing List');
  }

  /** @param {string} poNumber */
  async fillPackingListForm(poNumber) {
    await this.packingListNoInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.packingListNoInput.fill(poNumber);
    await this.invoiceNoInput.fill(poNumber);
    await this.cusdecNoInput.fill(poNumber);
    console.log('  → Packing List form filled');
  }

  async clickAutoPopulateOrderQuantity() {
    await this.autoPopulateBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.autoPopulateBtn.scrollIntoViewIfNeeded();
    await this.autoPopulateBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Auto Populate Order Quantity');
  }

  async confirmAlertYes() {
    await this.confirmYesBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.confirmYesBtn.click();
    console.log('  → Confirmed Yes on alert');
  }

  async fillSpreadsheetColumns() {
    await this.drawer.waitFor({ state: 'visible', timeout: 15000 });

    const spreadsheet = this.drawer.locator('.Spreadsheet__table').first();
    await spreadsheet.waitFor({ state: 'visible', timeout: 15000 });

    const headers = this.drawer.locator('.Spreadsheet__table tbody tr:first-child th.Spreadsheet__header');
    const headerCount = await headers.count();

    let batchNoColIndex = -1;
    let supplierPackageIDColIndex = -1;

    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).innerText();
      if (text.trim() === 'Batch No') batchNoColIndex = i;
      if (text.trim() === 'Supplier Package ID') supplierPackageIDColIndex = i;
    }

    console.log(`  → Batch No col: ${batchNoColIndex}, Supplier Package ID col: ${supplierPackageIDColIndex}`);

    const rows = this.drawer.locator('.Spreadsheet__table tbody tr[row]');
    const rowCount = await rows.count();
    console.log(`  → ${rowCount} actual data row(s) found`);

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const batchValue    = `BN_${String(rowIdx + 1).padStart(3, '0')}`;
      const supplierValue = `SP_${String(rowIdx + 1).padStart(3, '0')}`;

      const batchCell = rows.nth(rowIdx).locator('td.Spreadsheet__cell:not(.Spreadsheet__cell--readonly)').nth(0);
      await batchCell.scrollIntoViewIfNeeded();
      await batchCell.dblclick();
      await this.page.waitForTimeout(300);
      await this.page.keyboard.type(batchValue);
      console.log(`    Row ${rowIdx + 1}: Batch=${batchValue} typed`);

      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(300);
      await this.page.keyboard.type(supplierValue);
      console.log(`    Row ${rowIdx + 1}: SupplierPkg=${supplierValue} typed`);

      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(300);
    }
  }

  async clickSave() {
    await this.saveBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Save');
  }

  async clickSaveChanges() {
    await this.saveChangesBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Save Changes');
  }

  async clickSubmit() {
    await this.submitBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('  → Clicked Submit');
  }

  async waitForSuccessMessage() {
    await this.successMessage.waitFor({ state: 'visible', timeout: 20000 });
    console.log('  ✅ Upload successful!');
  }

  async clickUploadAnotherPackingList() {
    await this.uploadAnotherBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Upload Another Packing List');
  }
}

module.exports = { PLCreationPage };
