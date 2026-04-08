class CostingApprovalPage {
  constructor(page, env = 'UAT') {
    this.page = page;
    const isoHost = env === 'QA' ? 'erp-qa-m3-iso-ec2' : 'sin1auwm3iso001';

    this.m3Frame = env === 'QA'
    ? page.locator('body')
    : page.frameLocator('iframe').first();

    // Costing Approval SDK frame - nested inside M3
    this.m3FormFrame = env === 'QA'
  ? page.frameLocator('iframe[src*="costing-approval-sdk"]')
  : page.frameLocator(`iframe[src*="${isoHost}"]`)
        .frameLocator('iframe[src*="costing-approval-sdk"]');

    // ── Navigation ────────────────────────────────────────────────
    this.startTab = this.m3Frame.locator('#startDiv').first();
    this.costingApprovalBtn = env === 'QA'
  ? this.m3Frame.locator('#MyCanvas span[tag="/mne/apps/costing-approval-sdk/"]').filter({ hasText: 'Costing Approval SDK' })
  : this.m3Frame.locator('span[tag="/mne/apps/costing-approval-sdk/"]');

    // ── Page ready indicator ──────────────────────────────────────
    this.categoryLabel      = this.m3FormFrame.locator('label').filter({ hasText: 'Category' }).first();

    // ── Search fields ─────────────────────────────────────────────
    // Category - first kendo-combobox input
    this.categoryInput      = this.m3FormFrame.locator('kendo-combobox').nth(0).locator('input');
    this.categoryOption     = this.m3FormFrame.locator('[role="option"]').first();

    // Style - second kendo-combobox input + search button

this.styleInput     = this.m3FormFrame.locator('div.custom-grid-button input.k-input');
this.styleSearchBtn = this.m3FormFrame.locator('div.custom-grid-button button.grid-select');


    // CO Filter - third kendo-combobox input
  // Replace in constructor:
// In constructor - replace coFilterInput:
this.coFilterInput = this.m3FormFrame
  .locator('div.row:has(label:text-is("CO Filter:")) kendo-combobox input[role="combobox"]').nth(1);
this.coFilterOption = this.m3FormFrame.locator('[role="option"]').first();

    // ── Buttons ───────────────────────────────────────────────────
    // Replace in constructor:
this.loadBtn = this.m3FormFrame.locator('button:has-text("Load"):not([disabled])').filter({ hasText: /^Load$/ });
    this.approveBtn = this.m3FormFrame
  .locator('button:has-text("Approve"):not([disabled]):not(.k-state-disabled)');

    // ── Table ─────────────────────────────────────────────────────
    this.firstRowCheckbox   = this.m3FormFrame.locator('td[role="gridcell"]').first().locator('input[type="checkbox"]');
    this.firstRowCoNumber   = this.m3FormFrame.locator('td[role="gridcell"]').filter({ hasText: /^\d{10}$/ }).first();

    // ── Confirm dialog ────────────────────────────────────────────
    this.confirmYesBtn      = this.m3FormFrame.locator('button:has-text("Yes")');
  }

  async clickStartTab() {
    await this.startTab.waitFor({ state: 'visible', timeout: 15000 });
    await this.startTab.click();
    console.log('✅ Clicked Start tab');
  }

  async openCostingApprovalSDK() {
    await this.costingApprovalBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.costingApprovalBtn.click();

    // Wait for Costing Approval SDK frame to load
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
  // Wait for Load button to be enabled and click it
  const loadBtn = this.m3FormFrame.locator('button').filter({ hasText: /^\s*Load\s*$/ }).first();
  await loadBtn.waitFor({ state: 'visible', timeout: 30000 });
  await loadBtn.click();
  console.log('✅ Load button clicked');

  // Wait for table to load
  await this.m3FormFrame.locator('td[role="gridcell"]')
    .first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✅ Table loaded');
}

async fillCoFilter(coNumber) {
  const coFilterInput = this.m3FormFrame
    .locator('div.row:has(label:text-is("CO Filter:")) kendo-combobox input[role="combobox"]').nth(1);

  let attempts = 0;
  while (attempts < 3) {
    // Clear and type CO number
    await coFilterInput.waitFor({ state: 'visible', timeout: 15000 });
    await coFilterInput.click();
    await coFilterInput.clear();
    await coFilterInput.pressSequentially(coNumber, { delay: 50 });

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

      // Click Load again to refresh the table, then wait for it
      const loadBtn = this.m3FormFrame.locator('button').filter({ hasText: /^\s*Load\s*$/ }).first();
      await loadBtn.click();
      await this.m3FormFrame.locator('td[role="gridcell"]')
        .first().waitFor({ state: 'visible', timeout: 30000 });
      await this.page.waitForTimeout(2000);
    }
  }

  throw new Error(`❌ CO Filter option for ${coNumber} not found after 3 attempts`);
}

  async verifyCoNumberInTable(coNumber) {
    const coCell = this.m3FormFrame.locator('td[role="gridcell"]')
      .filter({ hasText: coNumber }).first();
    await coCell.waitFor({ state: 'visible', timeout: 15000 });
    console.log(`✅ CO Number verified in table: ${coNumber}`);
  }

  async selectFirstRowCheckbox() {
  // Find the first data row checkbox in the Select column
  const checkbox = this.m3FormFrame.locator('td[role="gridcell"] input[type="checkbox"].k-checkbox').first();
  await checkbox.waitFor({ state: 'visible', timeout: 15000 });
  await checkbox.click();
  console.log('✅ First row checkbox selected');

  // Wait a moment for Approve button to enable after selection
  await this.page.waitForTimeout(1000);
}

  async clickApprove() {
  // Wait for Approve to be enabled after checkbox selection
  await this.m3FormFrame.locator('button:has-text("Approve"):not([disabled]):not(.k-state-disabled)')
    .waitFor({ state: 'visible', timeout: 30000 });
  await this.approveBtn.click();
  console.log('✅ Approve button clicked');

  // Handle confirm dialog
  await this.confirmYesBtn.waitFor({ state: 'visible', timeout: 10000 });
  await this.confirmYesBtn.click();
  console.log('✅ Confirmed approval');
  console.log('⏳ Waiting 60 seconds for Approval..');
  await this.page.waitForTimeout(50000);
}
}

module.exports = { CostingApprovalPage };