class ConfirmGRNPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    // Click Delivery submenu
    await this.page
      .locator('.ant-menu-submenu-title:has-text("Delivery")')
      .first()
      .click();
    await this.page.waitForTimeout(1000);

    // Click Confirm GRN
    await this.page
      .locator('a[href="/raw-material/delivery/confirm-filtered"]:has-text("Confirm GRN")')
      .first()
      .click();
    await this.page.waitForTimeout(2000);
    console.log('✅ Navigated to Confirm GRN');
  }

  /** @param {string} poNumber */
  async enterPOAndClickNext(poNumber) {
    const poInput = this.page.locator('#poNo, input[placeholder="Enter Valid PO number to create a PL"]').first();
    await poInput.waitFor({ state: 'visible', timeout: 15000 });
    await poInput.click();
    await poInput.fill(poNumber);
    await this.page.waitForTimeout(500);

    await this.page.locator('button:has-text("Next")').first().click();
    await this.page.waitForTimeout(2000);
    console.log(`  → PO ${poNumber} entered and Next clicked`);
  }

  async selectAllRowsViaHeaderCheckbox() {
    // Click the header checkbox to select all rows
    const headerCheckbox = this.page
      .locator('thead .ant-checkbox-input')
      .first();
    await headerCheckbox.waitFor({ state: 'visible', timeout: 15000 });
    await headerCheckbox.click();
    await this.page.waitForTimeout(1000);
    console.log('  → All rows selected via header checkbox');
  }

  async clickUpdateM3() {
    await this.page.locator('button:has-text("Update M3")').first().click();
    console.log('  → Clicked Update M3, waiting 25 seconds...');
    await this.page.waitForTimeout(25000);
  }

  async verifyCompletedTab() {
    let found = false;

    for (let attempt = 1; attempt <= 5; attempt++) {
      // Click Completed tab
      await this.page
        .locator('label.ant-radio-button-wrapper:has-text("Completed")')
        .first()
        .click();
      await this.page.waitForTimeout(2000);

      // Check if any row exists in the table
      const rows = this.page.locator('.ant-table-row.editable-row.ant-table-row-level-0');
      const count = await rows.count();

      if (count > 0) {
        console.log(`  ✅ Completed tab has ${count} row(s) — verification passed`);
        found = true;
        break;
      }

      console.log(`  ⚠️ Attempt ${attempt}: No rows in Completed tab, switching to Pending and retrying...`);

      // Go back to Pending tab and wait
      await this.page
        .locator('label.ant-radio-button-wrapper:has-text("Pending")')
        .first()
        .click();
      await this.page.waitForTimeout(3000);
    }

    if (!found) {
      throw new Error('❌ Completed tab verification failed — no rows found after retries');
    }
  }

  async clickGoBack() {
    await this.page.locator('button:has-text("Go Back")').first().click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Go Back');
  }
}

module.exports = { ConfirmGRNPage };