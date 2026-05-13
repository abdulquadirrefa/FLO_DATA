const { buildLocators } = require('../../locators/m3/PLOverviewLocators');

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

  async waitForMarkAsPendingButton() {
    await this.page.waitForSelector(this.markPendingBtn, { timeout: 30000 });
    console.log('  ✅ Mark as Pending button appeared — In-House complete');
  }

  async clickBack() {
    await this.backBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked BACK');
  }
}

module.exports = { PLOverviewPage };
