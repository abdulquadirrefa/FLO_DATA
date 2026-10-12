const { buildLocators }               = require('../../locators/m3/CustomerOrderLocators');
const { getM3Frame, getM3FormFrame } = require('./m3Frames');

class CustomerOrderPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {'QA'|'UAT'} [env]
   */
  constructor(page, env = 'UAT') {
    this.page        = page;
    this.m3Frame     = getM3Frame(page, env);
    this.m3FormFrame = getM3FormFrame(page, env, 'customer-order-sdk');

    Object.assign(this, buildLocators(this.m3Frame, this.m3FormFrame));
  }

  async verifyPageLoaded() {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 30000 });
    console.log('✅ Customer Order Manager - loaded successfully');
  }

  async selectFacility(value) {
    await this.facilityInput.waitFor({ state: 'visible', timeout: 120000 });
    await this.facilityInput.click();
    await this.facilityInput.fill(value);
    await this.facilityOption.waitFor({ state: 'visible' });
    await this.facilityOption.click();
    console.log(`✅ Facility selected: ${value}`);
  }

  async selectStyle(buyerDivision, m3Style) {
    await this.styleSearchBtn.waitFor({ state: 'visible' });
    await this.styleSearchBtn.click();

    await this.buyerDivisionInput.waitFor({ state: 'visible' });
    await this.buyerDivisionInput.click();
    await this.buyerDivisionInput.clear();
    await this.buyerDivisionInput.pressSequentially(buyerDivision, { delay: 80 });
    await this.buyerDivisionOption.waitFor({ state: 'visible' });
    await this.buyerDivisionOption.click();

    await this.m3StyleInput.waitFor({ state: 'visible' });
    await this.m3StyleInput.fill(m3Style);

    await this.searchBtn.waitFor({ state: 'visible' });
    await this.searchBtn.click();

    await this.firstDataRow.waitFor({ state: 'visible', timeout: 30000 });
    await this.firstDataRow.click();

    await this.selectBtn.waitFor({ state: 'visible' });
    await this.selectBtn.click();
    console.log(`✅ Style selected: ${m3Style}`);
  }

  async selectFutureDate() {
    await this.calendarToggle.waitFor({ state: 'visible' });
    await this.calendarToggle.click();

    const calendar = this.m3FormFrame.locator('kendo-calendar').first();
    await calendar.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(300);

    // Press ArrowDown 10 times (each moves 1 week forward = 70 days total),
    // then Enter to select — works regardless of current date
    for (let i = 0; i < 10; i++) {
      await this.page.keyboard.press('ArrowDown');
      await this.page.waitForTimeout(100);
    }
    await this.page.keyboard.press('Enter');

    const future = new Date();
    future.setDate(future.getDate() + 70);
    console.log(`✅ Future date selected: ${future.toDateString()}`);
  }

  async fillFormFields(data) {
    await this.cpoNumberInput.waitFor({ state: 'visible' });
    await this.cpoNumberInput.fill(data.cpONumber);
    console.log(`✅ CPO Entered: ${data.cpONumber}`);

    await this.vpoNumberInput.waitFor({ state: 'visible' });
    await this.vpoNumberInput.fill(data.vpoNumber);
    console.log(`✅ VPO Entered: ${data.vpoNumber}`);

    await this.leadFactoryInput.waitFor({ state: 'visible' });
    await this.leadFactoryInput.click();
    await this.leadFactoryInput.fill(data.leadFactory);
    await this.leadFactoryOption.waitFor({ state: 'visible' });
    await this.leadFactoryOption.click();
    console.log(`✅ Lead Factory Entered: ${data.leadFactory}`);

    await this.projectionInput.waitFor({ state: 'visible' });
    await this.projectionInput.fill(data.projectionCode);
    console.log(`✅ Projection Code Entered: ${data.projectionCode}`);

    await this.bomInput.waitFor({ state: 'visible' });
    await this.bomInput.click();
    await this.bomInput.fill(data.bom);
    await this.bomOption.waitFor({ state: 'visible' });
    await this.bomOption.click();
    console.log(`✅ BOM Entered: ${data.bom}`);

    await this.buyTypeInput.waitFor({ state: 'visible' });
    await this.buyTypeInput.click();
    await this.buyTypeInput.fill(data.buyType);
    await this.buyTypeOption.waitFor({ state: 'visible' });
    await this.buyTypeOption.click();
    console.log(`✅ Buy Type Entered: ${data.buyType}`);

    await this.buyerNameInput.waitFor({ state: 'visible' });
    await this.buyerNameInput.fill(data.buyerName);
    console.log(`✅ Buyer Name Entered: ${data.buyerName}`);

    console.log('✅ All form fields filled');
  }

  async clickCreateAndGetCoNumber() {
    await this.createBtn.waitFor({ state: 'visible' });
    await this.createBtn.click();
    console.log('✅ Create button clicked');

    await this.m3FormFrame.locator('#id_coNumber_header input').waitFor({ state: 'attached' });

    let coNumber = '';
    for (let i = 0; i < 20; i++) {
      coNumber = await this.coNumberInput.inputValue();
      if (coNumber && coNumber.trim() !== '') break;
      await this.page.waitForTimeout(1000);
    }

    console.log(`✅ CO Number generated: ${coNumber}`);
    return coNumber;
  }

  // ── Update order flow ───────────────────────────────────────────
  async verifyLoadedCoNumber(expectedCoNumber) {
    await this.coNumberInput.waitFor({ state: 'visible', timeout: 120000 });

    let coNumber = '';
    for (let i = 0; i < 60; i++) {
      coNumber = (await this.coNumberInput.inputValue()).trim();
      if (coNumber === expectedCoNumber) break;
      await this.page.waitForTimeout(1000);
    }

    if (coNumber !== expectedCoNumber) {
      throw new Error(`❌ Customer Order Manager loaded CO "${coNumber}", expected "${expectedCoNumber}"`);
    }
    console.log(`✅ Customer Order Manager loaded with CO: ${coNumber}`);
  }

  async updateVpoNumber(value) {
    await this.vpoNumberInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.vpoNumberInput.click();
    await this.vpoNumberInput.fill(value);
    console.log(`✅ VPO changed to: ${value}`);
  }

  async clickUpdateAndWaitForLineEntry() {
    await this.updateBtn.waitFor({ state: 'visible', timeout: 30000 });
    await this.updateBtn.click();
    console.log('✅ Update button clicked');

    await this.zFeatureInput.waitFor({ state: 'visible', timeout: 120000 });
    console.log('✅ Line Entry fields loaded');
  }
}

module.exports = { CustomerOrderPage };
