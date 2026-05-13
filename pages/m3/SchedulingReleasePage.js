const { buildLocators } = require('../../locators/m3/SchedulingReleaseLocators');

class SchedulingReleasePage {
  constructor(page, env = 'UAT') {
    this.page = page;
    const isoHost = env === 'QA' ? 'erp-qa-m3-iso-ec2' : 'sin1auwm3iso001';

    this.m3Frame = env === 'QA'
      ? page.locator('body')
      : page.frameLocator('iframe').first();

    this.m3FormFrame = env === 'QA'
      ? page.frameLocator('iframe[src*="schedule-release-sdk"]')
      : page.frameLocator(`iframe[src*="${isoHost}"]`)
            .frameLocator('iframe[src*="schedule-release-sdk"]');

    Object.assign(this, buildLocators(this.m3Frame, this.m3FormFrame, env));
  }

  async clickStartTab() {
    await this.startTab.waitFor({ state: 'visible', timeout: 15000 });
    await this.startTab.click();
    console.log('✅ Clicked Start tab');
  }

  async openSchedulingReleaseSDK() {
    await this.schedulingReleaseBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.schedulingReleaseBtn.click();

    await this.facilityLabel.waitFor({ state: 'visible', timeout: 50000 });
    console.log('✅ Scheduling and Release SDK loaded');
  }

  async fillFacility(value) {
    await this.facilityInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.facilityInput.click();
    await this.facilityInput.pressSequentially(value, { delay: 50 });

    await this.facilityOption.waitFor({ state: 'visible', timeout: 10000 });
    await this.facilityOption.click();
    console.log(`✅ Facility filled: ${value}`);
    await this.page.waitForTimeout(3000);
  }

  async fillStyle(value) {
    await this.styleInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.styleInput.click();
    await this.styleInput.clear();
    await this.styleInput.pressSequentially(value, { delay: 50 });

    const option = this.gridOption.filter({ hasText: value }).first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    console.log(`✅ Style filled: ${value}`);
  }

  async clickRetrieve() {
    await this.retrieveBtn.waitFor({ state: 'visible' });
    await this.retrieveBtn.click();
    console.log('✅ Retrieve clicked');
    await this.page.waitForTimeout(30000);
  }

  async hasTableData() {
    const rowCount = await this.tableRows.count();
    console.log(`>>> Table rows found: ${rowCount}`);
    return rowCount > 0;
  }

  async selectScheduleFromDialog() {
    await this.scheduleSearchBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.scheduleSearchBtn.click();
    console.log('✅ Schedule search icon clicked');

    const dialogRow = this.m3FormFrame
      .locator('td[role="gridcell"][aria-colindex="2"]')
      .filter({ hasText: this._coNumber })
      .locator('..');

    await dialogRow.waitFor({ state: 'visible', timeout: 15000 });

    const scheduleNumber = await dialogRow
      .locator('td[aria-colindex="3"]')
      .innerText();
    console.log(`✅ Schedule Number found: ${scheduleNumber.trim()}`);

    this._scheduleNumber = scheduleNumber.trim();

    await dialogRow.locator('td[aria-colindex="1"]').click();
    console.log('✅ Schedule row selected in dialog');

    await this.scheduleDialogSelect.waitFor({ state: 'visible' });
    await this.scheduleDialogSelect.click();
    console.log('✅ Select clicked in Schedule dialog');
  }

  async verifyAndClickReleaseSchedule() {
    await this.releaseScheduleEnabled.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✅ Release Schedule button is enabled');

    await this.releaseScheduleBtn.click();
    console.log('✅ Release Schedule clicked');

    await this.confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.confirmBtn.click();
    console.log('✅ Release Schedule confirmed');
    await this.page.waitForTimeout(5000);
  }

  async handleSchedulingFlow(data) {
    this._coNumber = data.generatedCoNumber;

    let coFilled = false;
    let attempts = 0;

    while (!coFilled && attempts < 5) {
      if (attempts > 0) {
        console.log(`⚠️ CO Number option not found, clearing and retrying from Facility (${attempts}/5)...`);

        await this.facilityInput.waitFor({ state: 'visible', timeout: 15000 });
        await this.facilityInput.click({ clickCount: 3 });
        await this.facilityInput.fill('');
        await this.page.waitForTimeout(1000);
      }

      await this.fillFacility(data.schedulingFacility);

      await this.styleInput.waitFor({ state: 'visible', timeout: 15000 });
      await this.styleInput.click({ clickCount: 3 });
      await this.styleInput.fill('');
      await this.page.waitForTimeout(1000);

      await this.fillStyle(data.m3Style);

      try {
        await this.coNumberInput.waitFor({ state: 'visible', timeout: 15000 });
        await this.coNumberInput.click();
        await this.coNumberInput.pressSequentially(data.generatedCoNumber, { delay: 50 });

        const option = this.gridOption.filter({ hasText: data.generatedCoNumber }).first();
        await option.waitFor({ state: 'visible', timeout: 10000 });
        await option.click();
        console.log(`✅ CO Number filled: ${data.generatedCoNumber}`);
        coFilled = true;

      } catch {
        attempts++;
      }
    }

    if (!coFilled) {
      throw new Error(`❌ CO Number option for ${data.generatedCoNumber} not found after 3 attempts`);
    }

    await this.clickRetrieve();

    const hasData = await this.hasTableData();

    if (hasData) {
      console.log('>>> Scenario 1: Table has data after first Retrieve');
      console.log('⏳ Waiting 15 seconds before Add Schedule...');
      await this.page.waitForTimeout(15000);

      await this.addScheduleEnabled.waitFor({ state: 'visible', timeout: 15000 });
      await this.addScheduleBtn.click();
      console.log('✅ Add Schedule clicked');

      console.log('⏳ Waiting 30 seconds after Add Schedule...');
      await this.page.waitForTimeout(25000);

      await this.clickRetrieve();
    } else {
      console.log('>>> Scenario 2: No data after first Retrieve');
    }

    await this.selectScheduleFromDialog();
    await this.clickRetrieve();

    await this.mainTableFirstRow.waitFor({ state: 'visible', timeout: 30000 });
    console.log('✅ Main table loaded with data');

    await this.verifyAndClickReleaseSchedule();
  }
}

module.exports = { SchedulingReleasePage };
