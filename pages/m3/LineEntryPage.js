const { buildLocators } = require('../../locators/m3/LineEntryLocators');

class LineEntryPage {
  constructor(page, env = 'UAT') {
    this.page = page;

    const isoHost = env === 'QA' ? 'erp-qa-m3-iso-ec2' : 'sin1auwm3iso001';

    this.m3Frame = env === 'QA'
      ? page.locator('body')
      : page.frameLocator('iframe').first();

    this.m3FormFrame = env === 'QA'
      ? page.frameLocator('iframe[src*="customer-order-sdk"]')
      : page.frameLocator(`iframe[src*="${isoHost}"]`)
            .frameLocator('iframe[src*="customer-order-sdk"]');

    Object.assign(this, buildLocators(this.m3FormFrame));
  }

  async scrollToLineEntry() {
    await this.page.waitForTimeout(2000);
    await this.zFeatureSection.scrollIntoViewIfNeeded();
    console.log('✅ Scrolled to Line Entry section');
  }

  async fillZFeature(value) {
    await this.zFeatureInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.zFeatureInput.click();
    await this.zFeatureInput.clear();
    await this.zFeatureInput.pressSequentially(value, { delay: 50 });

    const exactOption = this.gridOption.filter({ hasText: value }).first();
    await exactOption.waitFor({ state: 'visible', timeout: 60000 });
    await exactOption.click();
    console.log(`✅ Z Feature filled: ${value}`);
  }

  async fillDateCode(value) {
    await this.dateCodeInput.waitFor({ state: 'visible' });
    await this.dateCodeInput.click();
    await this.dateCodeInput.fill(value);
    console.log(`✅ Date Code filled: ${value}`);
  }

  async fillDestination(value) {
    await this.destinationInput.waitFor({ state: 'visible' });
    await this.destinationInput.click();
    await this.destinationInput.clear();
    await this.destinationInput.pressSequentially(value, { delay: 50 });

    await this.destinationOption.waitFor({ state: 'visible', timeout: 60000 });
    await this.destinationOption.click();
    console.log(`✅ Destination filled: ${value}`);
  }

  async fillSalesChannel(value) {
    await this.salesChannelInput.waitFor({ state: 'visible' });
    await this.salesChannelInput.click();
    await this.salesChannelInput.clear();
    await this.salesChannelInput.pressSequentially(value, { delay: 50 });

    const exactOption = this.gridOption.filter({ hasText: value }).first();
    await exactOption.waitFor({ state: 'visible', timeout: 60000 });
    await exactOption.click();
    console.log(`✅ Sales Channel filled: ${value}`);
  }

  async fillOtherZ(value) {
    await this.otherZInput.waitFor({ state: 'visible' });
    await this.otherZInput.click();
    await this.otherZInput.fill(value);
    console.log(`✅ Other Z filled: ${value}`);
  }

  async fillPackMethod(value) {
    await this.packMethodInput.waitFor({ state: 'visible' });
    await this.packMethodInput.click();
    await this.packMethodInput.clear();
    await this.packMethodInput.pressSequentially(value, { delay: 50 });

    const exactOption = this.gridOption.filter({ hasText: new RegExp(value, 'i') }).first();
    await exactOption.waitFor({ state: 'visible', timeout: 60000 });
    await exactOption.click();
    console.log(`✅ Pack Method filled: ${value}`);
  }

  async fillColorRowQty(expectedColors, qty) {
    await this.addLinesBtn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);

    const colors = Array.isArray(expectedColors) ? expectedColors : [expectedColors];

    for (const expectedColor of colors) {
      const colorCell = this.colorGridCell.filter({ hasText: expectedColor }).first();
      await colorCell.waitFor({ state: 'visible', timeout: 15000 });

      const rowIndex = await colorCell.locator('..').getAttribute('data-kendo-grid-item-index');
      const gridRow  = parseInt(rowIndex) + 2;
      console.log(`✅ Found color row: ${expectedColor} at item index ${rowIndex}`);

      const sizeCells = [
        { name: 'S',  id: `k-grid1-r${gridRow}c4` },
        { name: 'M',  id: `k-grid1-r${gridRow}c5` },
        { name: 'L',  id: `k-grid1-r${gridRow}c6` },
        { name: 'XL', id: `k-grid1-r${gridRow}c7` },
        { name: 'XS', id: `k-grid1-r${gridRow}c8` },
      ];

      for (const { name, id } of sizeCells) {
        const cell = this.m3FormFrame.locator(`td#${id}`);
        await cell.waitFor({ state: 'visible', timeout: 5000 });
        await cell.click();

        const input = this.m3FormFrame.locator(`td#${id} input`);
        await input.waitFor({ state: 'visible', timeout: 5000 });
        await input.click({ clickCount: 3 });
        await input.fill(qty);
        await input.press('Tab');
        console.log(`✅ Size ${name} filled with: ${qty}`);
      }
    }

    await this.zFeatureSection.click();
    await this.page.waitForTimeout(1000);
  }

  async verifyAddLinesButton() {
    await this.addLinesBtn.waitFor({ state: 'visible', timeout: 30000 });
    console.log('✅ Add Lines button is visible');
  }

  async clickAddLines() {
    await this.addLinesBtn.waitFor({ state: 'visible' });
    await this.addLinesBtn.click();
    console.log('✅ Add Lines clicked');

    console.log('⏳ Waiting 60 seconds for Add Lines to process...');
    await this.page.waitForTimeout(30000);
    console.log('✅ Add Lines processing complete');
  }

  async clickReleaseForCosting() {
    await this.addLinesEnabled.waitFor({ state: 'visible', timeout: 30000 });
    await this.releaseForCostingBtn.click();
    console.log('✅ Release for Costing clicked');

    await this.confirmBtnAlt.waitFor({ state: 'visible', timeout: 30000 });
    await this.confirmBtnAlt.click();
    console.log('✅ Release for Costing confirmed');

    await this.page.waitForTimeout(20000);
  }
}

module.exports = { LineEntryPage };
