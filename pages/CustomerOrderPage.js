class CustomerOrderPage {
  constructor(page, env = 'UAT') {
    this.page = page;

    const isoHost = env === 'QA' ? 'erp-qa-m3-iso-ec2' : 'sin1auwm3iso001';

      this.m3Frame = env === 'QA'
    ? page.locator('body')
    : page.frameLocator('iframe').first();

    // Frame 4 - Customer order form (nested inside Frame 3)
    // ✅ QA: SDK loads directly in the page, no intermediate iso frame
    // UAT: SDK is nested inside the iso frame
    this.m3FormFrame = env === 'QA'
      ? page.frameLocator('iframe[src*="customer-order-sdk"]')
      : page.frameLocator(`iframe[src*="${isoHost}"]`)
            .frameLocator('iframe[src*="customer-order-sdk"]');

    // Page title - lives in first iframe
    this.pageTitle = this.m3Frame.locator('span.tabTitle')
                         .filter({ hasText: 'Customer Order Manager' });

    // ── Form fields - all in m3FormFrame ─────────────────────────

    // Facility
    this.facilityInput     = this.m3FormFrame.locator('input[role="combobox"][placeholder="- SELECT -"]').first();
    this.facilityOption    = this.m3FormFrame.locator('[role="option"]').first();

    // Style search button
    this.styleSearchBtn    = this.m3FormFrame.locator('button.grid-select.k-icon.k-i-zoom');

    // Style dialog - Buyer Division
   // Style dialog - Buyer Division
// Scoped inside the Search Style dialog container
this.buyerDivisionInput  = this.m3FormFrame.locator('.k-window input[role="combobox"]').first();
this.buyerDivisionOption = this.m3FormFrame.locator('[role="option"]').first();

    // Style dialog - M3 Style & search
    // Scope everything inside the Search Style dialog
this.styleDialog         = this.m3FormFrame.locator('.k-window, [role="dialog"]').filter({ hasText: 'Search Style' });
this.buyerDivisionInput  = this.styleDialog.locator('input').first();
this.m3StyleInput        = this.styleDialog.locator('input').nth(1);
this.searchBtn           = this.styleDialog.locator('button#searchBtn, button:has-text("Search")');
this.firstDataRow        = this.styleDialog.locator('td[role="gridcell"][aria-colindex="1"]').first();
this.selectBtn           = this.styleDialog.locator('button#selectBtn, button:has-text("Select")');

    // Date picker
this.calendarToggle = this.m3FormFrame.locator('#id_requestedDeliveryDate_header span.k-select[title="Toggle calendar"]');

    // CPO Number (maxlength=20, first occurrence)
    this.cpoNumberInput    = this.m3FormFrame.locator('input[maxlength="20"]').first();

    // VPO Number (maxlength=17)
    this.vpoNumberInput    = this.m3FormFrame.locator('input[maxlength="17"]');

// Lead Factory - id_prodWarehouse_header
this.leadFactoryInput  = this.m3FormFrame.locator('#id_prodWarehouse_header input[role="combobox"]');
this.leadFactoryOption = this.m3FormFrame.locator('[role="option"]').first();

// Projection Code - note capital P in id
this.projectionInput   = this.m3FormFrame.locator('#id_ProjectionCode_header input');

// BOM Version
this.bomInput          = this.m3FormFrame.locator('#id_bomVersion_header input[role="combobox"]');
this.bomOption         = this.m3FormFrame.locator('[role="option"]').first();

// Buy Type
this.buyTypeInput      = this.m3FormFrame.locator('#id_buyType_header input[role="combobox"]');
this.buyTypeOption     = this.m3FormFrame.locator('[role="option"]').first();

// Buy Name
this.buyerNameInput    = this.m3FormFrame.locator('#id_buyName_header input');

// CO Number - readonly field, generated after Create
this.coNumberInput = this.m3FormFrame.locator('#id_coNumber_header input');



    // Create button
    this.createBtn         = this.m3FormFrame.locator('button#createButton');
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
    // Open style search dialog
    await this.styleSearchBtn.waitFor({ state: 'visible' });
    await this.styleSearchBtn.click();

    // Fill Buyer Division
    await this.buyerDivisionInput.waitFor({ state: 'visible' });
    await this.buyerDivisionInput.click();
    await this.buyerDivisionInput.clear();
    await this.buyerDivisionInput.pressSequentially(buyerDivision, { delay: 80 });
    await this.buyerDivisionOption.waitFor({ state: 'visible' });
    await this.buyerDivisionOption.click();

    // Fill M3 Style
    await this.m3StyleInput.waitFor({ state: 'visible' });
    await this.m3StyleInput.fill(m3Style);

    // Click Search
    await this.searchBtn.waitFor({ state: 'visible' });
    await this.searchBtn.click();

    // Click first data row
    await this.firstDataRow.waitFor({ state: 'visible', timeout: 15000 });
    await this.firstDataRow.click();

    // Click Select
    await this.selectBtn.waitFor({ state: 'visible' });
    await this.selectBtn.click();
    console.log(`✅ Style selected: ${m3Style}`);
  }

  async selectFutureDate() {
  await this.calendarToggle.waitFor({ state: 'visible' });
  await this.calendarToggle.click();

  // Wait for calendar to fully render and stabilize
  const calendar = this.m3FormFrame.locator('kendo-calendar').first();
  await calendar.waitFor({ state: 'visible', timeout: 10000 });

  // Small wait to ensure calendar is fully stable before interacting
  await this.page.waitForTimeout(500);

  // Click day 15 of the currently visible month
  // Using exact text match with k-link class to avoid partial matches
  const dayCell = calendar.locator('tbody td:not(.k-other-month) .k-link')
    .filter({ hasText: /^15$/ })
    .first();

  await dayCell.waitFor({ state: 'visible', timeout: 10000 });

  // Single precise click - no double clicking
  await dayCell.click({ force: false, timeout: 5000 });

  // Verify calendar closed after selection
  await calendar.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
    // If calendar didn't close, click elsewhere to dismiss
    this.m3FormFrame.locator('#id_coNumber_header').click();
  });

  const future = new Date();
  future.setMonth(future.getMonth() + 1);
  future.setDate(15);
  console.log(`✅ Future date selected: ${future.toDateString()}`);
}

  async fillFormFields(data) {
    // CPO Number
    await this.cpoNumberInput.waitFor({ state: 'visible' });
    await this.cpoNumberInput.fill(data.cpONumber);
    console.log(`✅ CPO Entered: ${data.cpONumber}`);


    // VPO Number
    await this.vpoNumberInput.waitFor({ state: 'visible' });
    await this.vpoNumberInput.fill(data.vpoNumber);
    console.log(`✅ VPO Entered: ${data.vpoNumber}`);

    // Lead Factory
    await this.leadFactoryInput.waitFor({ state: 'visible' });
    await this.leadFactoryInput.click();
    await this.leadFactoryInput.fill(data.leadFactory);
    await this.leadFactoryOption.waitFor({ state: 'visible' });
    await this.leadFactoryOption.click();
    console.log(`✅ Lead Factory Entered: ${data.leadFactory}`);

    // Projection Code
    await this.projectionInput.waitFor({ state: 'visible' });
    await this.projectionInput.fill(data.projectionCode);
    console.log(`✅ Projection Code Entered: ${data.projectionCode}`);

    // BOM
    await this.bomInput.waitFor({ state: 'visible' });
    await this.bomInput.click();
    await this.bomInput.fill(data.bom);
    await this.bomOption.waitFor({ state: 'visible' });
    await this.bomOption.click();
    console.log(`✅ BOM Entered: ${data.bom}`);

    // Buy Type
    await this.buyTypeInput.waitFor({ state: 'visible' });
    await this.buyTypeInput.click();
    await this.buyTypeInput.fill(data.buyType);
    await this.buyTypeOption.waitFor({ state: 'visible' });
    await this.buyTypeOption.click();
    console.log(`✅ Buy Type Entered: ${data.buyType}`);

    // Buyer Name
    await this.buyerNameInput.waitFor({ state: 'visible' });
    await this.buyerNameInput.fill(data.buyerName);
    console.log(`✅ Buyer Name Entered: ${data.buyerName}`);

    console.log('✅ All form fields filled');
  }

 async clickCreateAndGetCoNumber() {
  await this.createBtn.waitFor({ state: 'visible' });
  await this.createBtn.click();
  console.log('✅ Create button clicked');

  // Wait for CO Number input to have a value populated
  await this.m3FormFrame.locator('#id_coNumber_header input').waitFor({ state: 'attached' });
  
  // Keep polling until value is not empty
  let coNumber = '';
  for (let i = 0; i < 20; i++) {
    coNumber = await this.coNumberInput.inputValue();
    if (coNumber && coNumber.trim() !== '') break;
    await this.page.waitForTimeout(1000); // wait 1 second between retries
  }

  console.log(`✅ CO Number generated: ${coNumber}`);
  return coNumber;
}
}

module.exports = { CustomerOrderPage };