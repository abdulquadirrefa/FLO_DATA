class PLOverviewPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    await this.page
      .locator('a[href="/raw-material/delivery/pl-overview"]:has-text("PL Overview")')
      .first()
      .click();
    await this.page.waitForTimeout(3000);
    console.log('✅ Navigated to PL Overview');
  }

  /** @param {string} poNumber */
  async clickEyeIconForPO(poNumber) {
    const pendingSection = this.page
      .locator('.ant-col:has(h4:has-text("PENDING"))')
      .first();
    await pendingSection.waitFor({ state: 'visible', timeout: 15000 });

    const card = pendingSection.locator('.ant-card').filter({ hasText: poNumber }).first();
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await card.scrollIntoViewIfNeeded();

    const eyeIcon = card.locator('.anticon-eye, [aria-label="icon: eye"]').first();
    await eyeIcon.waitFor({ state: 'visible', timeout: 10000 });
    await eyeIcon.click();
    await this.page.waitForTimeout(3000);
    console.log(`  → Opened detail view for PO: ${poNumber}`);
  }

  async clickMarkAsInHouse() {
    await this.page
      .locator('button.ant-btn-primary:has-text("Mark as In-House")')
      .first()
      .click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Mark as In-House');
  }

  async confirmAlertYes() {
    const yesBtn = this.page
      .locator('.ant-popover-buttons button:has-text("Yes"), .ant-popconfirm-buttons button:has-text("Yes"), button.ant-btn-primary:has-text("Yes")')
      .first();
    await yesBtn.waitFor({ state: 'visible', timeout: 10000 });
    await yesBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Confirmed Yes');
  }

  async selectAutoGenerateEntryNo() {
    const dialog = this.page.locator('.ant-modal, .ant-modal-content').first();
    await dialog.waitFor({ state: 'visible', timeout: 15000 });

    await dialog.locator('.ant-select-selection').first().click();
    await this.page.waitForTimeout(1000);

    const autoGenOption = this.page
      .locator('.ant-select-dropdown-menu-item, li.ant-select-dropdown-menu-item')
      .filter({ hasText: 'Auto Generate' })
      .first();
    await autoGenOption.waitFor({ state: 'visible', timeout: 10000 });
    await autoGenOption.click();
    await this.page.waitForTimeout(500);

    await dialog.locator('button:has-text("Ok"), button:has-text("OK")').first().click();
    await this.page.waitForTimeout(3000);
    console.log('  → Selected Auto Generate and clicked Ok');
  }

  async waitForMarkAsPendingButton() {
    await this.page.waitForSelector('button:has-text("Mark as Pending")', { timeout: 30000 });
    console.log('  ✅ Mark as Pending button appeared — In-House complete');
  }

  async clickBack() {
    await this.page
      .locator('button:has-text("BACK"), a:has-text("BACK")')
      .first()
      .click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked BACK');
  }
}

module.exports = { PLOverviewPage };