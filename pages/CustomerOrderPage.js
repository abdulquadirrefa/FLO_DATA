const { buildLocators } = require('../locators/CustomerOrderLocators');

class CustomerOrderPage {
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

    await this.firstDataRow.waitFor({ state: 'visible', timeout: 15000 });
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
    await this.page.waitForTimeout(500);

    const dayCell = calendar.locator('tbody td:not(.k-other-month) .k-link')
      .filter({ hasText: /^15$/ })
      .first();

    await dayCell.waitFor({ state: 'visible', timeout: 10000 });
    await dayCell.click({ force: false, timeout: 5000 });

    await calendar.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
      this.m3FormFrame.locator('#id_coNumber_header').click();
    });

    const future = new Date();
    future.setMonth(future.getMonth() + 1);
    future.setDate(15);
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
}

module.exports = { CustomerOrderPage };
