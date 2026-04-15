const { buildLocators } = require('../locators/CostingApprovalLocators');

class CostingApprovalPage {
  constructor(page, env = 'UAT') {
    this.page = page;
    const isoHost = env === 'QA' ? 'erp-qa-m3-iso-ec2' : 'sin1auwm3iso001';

    this.m3Frame = env === 'QA'
      ? page.locator('body')
      : page.frameLocator('iframe').first();

    this.m3FormFrame = env === 'QA'
      ? page.frameLocator('iframe[src*="costing-approval-sdk"]')
      : page.frameLocator(`iframe[src*="${isoHost}"]`)
            .frameLocator('iframe[src*="costing-approval-sdk"]');

    Object.assign(this, buildLocators(this.m3Frame, this.m3FormFrame, env));
  }

  async clickStartTab() {
    await this.startTab.waitFor({ state: 'visible', timeout: 15000 });
    await this.startTab.click();
    console.log('✅ Clicked Start tab');
  }

  async openCostingApprovalSDK() {
    await this.costingApprovalBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.costingApprovalBtn.click();

    await this.categoryLabel.waitFor({ state: 'visible', timeout: 50000 });
    console.log('✅ Costing Approval SDK loaded');
  }

  async fillCategory(value) {
    await this.categoryInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.categoryInput.click();
    await this.categoryInput.clear();
    await this.categoryInput.pressSequentially(value, { delay: 50 });

    const exactOption = this.m3FormFrame.locator('[role="option"]')
      .filter({ hasText: value }).first();
    await exactOption.waitFor({ state: 'visible', timeout: 10000 });
    await exactOption.click();
    console.log(`✅ Category filled: ${value}`);
  }

  async fillStyle(value) {
    await this.styleInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.styleInput.click();
    await this.styleInput.clear();
    await this.styleInput.pressSequentially(value, { delay: 50 });

    await this.styleSearchBtn.waitFor({ state: 'visible' });
    await this.styleSearchBtn.click();
    console.log(`✅ Style filled and search clicked: ${value}`);
  }

  async waitForLoadAndClick() {
    await this.loadBtn.waitFor({ state: 'visible', timeout: 30000 });
    await this.loadBtn.click();
    console.log('✅ Load button clicked');

    await this.gridCell.first().waitFor({ state: 'visible', timeout: 30000 });
    console.log('✅ Table loaded');
  }

  async fillCoFilter(coNumber) {
    let attempts = 0;
    while (attempts < 3) {
      await this.coFilterInput.waitFor({ state: 'visible', timeout: 15000 });
      await this.coFilterInput.click();
      await this.coFilterInput.clear();
      await this.coFilterInput.pressSequentially(coNumber, { delay: 50 });

      const exactOption = this.m3FormFrame.locator('[role="option"]')
        .filter({ hasText: coNumber }).first();

      try {
        await exactOption.waitFor({ state: 'visible', timeout: 10000 });
        await exactOption.click();
        console.log(`✅ CO Filter filled: ${coNumber}`);
        return;
      } catch {
        attempts++;
        console.log(`⚠️ CO Filter option not found, clicking Load again and retrying (${attempts}/3)...`);

        await this.loadBtn.click();
        await this.gridCell.first().waitFor({ state: 'visible', timeout: 30000 });
        await this.page.waitForTimeout(2000);
      }
    }

    throw new Error(`❌ CO Filter option for ${coNumber} not found after 3 attempts`);
  }

  async verifyCoNumberInTable(coNumber) {
    const coCell = this.gridCell.filter({ hasText: coNumber }).first();
    await coCell.waitFor({ state: 'visible', timeout: 15000 });
    console.log(`✅ CO Number verified in table: ${coNumber}`);
  }

  async selectFirstRowCheckbox() {
    await this.firstRowCheckbox.waitFor({ state: 'visible', timeout: 15000 });
    await this.firstRowCheckbox.click();
    console.log('✅ First row checkbox selected');

    await this.page.waitForTimeout(1000);
  }

  async clickApprove() {
    await this.approveBtn.waitFor({ state: 'visible', timeout: 30000 });
    await this.approveBtn.click();
    console.log('✅ Approve button clicked');

    await this.confirmYesBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.confirmYesBtn.click();
    console.log('✅ Confirmed approval');
    console.log('⏳ Waiting 60 seconds for Approval..');
    await this.page.waitForTimeout(50000);
  }
}

module.exports = { CostingApprovalPage };
