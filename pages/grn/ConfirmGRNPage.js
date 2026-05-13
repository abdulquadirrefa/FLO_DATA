const { buildLocators } = require('../../locators/grn/ConfirmGRNLocators');

class ConfirmGRNPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  async navigate() {
    await this.deliverySubmenu.click();
    await this.page.waitForTimeout(1000);

    await this.confirmGRNLink.click();
    await this.page.waitForTimeout(2000);
    console.log('✅ Navigated to Confirm GRN');
  }

  /** @param {string} poNumber */
  async enterPOAndClickNext(poNumber) {
    await this.poInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.poInput.click();
    await this.poInput.fill(poNumber);
    await this.page.waitForTimeout(500);

    await this.nextBtn.click();
    await this.page.waitForTimeout(2000);
    console.log(`  → PO ${poNumber} entered and Next clicked`);
  }

  async selectAllRowsViaHeaderCheckbox() {
    await this.headerCheckbox.waitFor({ state: 'visible', timeout: 15000 });
    await this.headerCheckbox.click();
    await this.page.waitForTimeout(1000);

    const dialogVisible = await this.selectCurrentPageBtn.isVisible();
    if (dialogVisible) {
      await this.selectCurrentPageBtn.click();
      await this.page.waitForTimeout(1000);
      console.log('  → Dialog appeared — clicked "Select Current Page"');
    }

    console.log('  → All rows selected via header checkbox');
  }

  async clickUpdateM3() {
    await this.updateM3Btn.click();
    console.log('  → Clicked Update M3, waiting 25 seconds...');
    await this.page.waitForTimeout(25000);
  }

  async verifyCompletedTab() {
    let found = false;

    for (let attempt = 1; attempt <= 5; attempt++) {
      await this.completedTab.click();
      await this.page.waitForTimeout(2000);

      const count = await this.tableRows.count();

      if (count > 0) {
        console.log(`  ✅ Completed tab has ${count} row(s) — verification passed`);
        found = true;
        break;
      }

      console.log(`  ⚠️ Attempt ${attempt}: No rows in Completed tab, switching to Pending and retrying...`);

      await this.pendingTab.click();
      await this.page.waitForTimeout(3000);
    }

    if (!found) {
      throw new Error('❌ Completed tab verification failed — no rows found after retries');
    }
  }

  async clickGoBack() {
    await this.goBackBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Go Back');
  }
}

module.exports = { ConfirmGRNPage };
