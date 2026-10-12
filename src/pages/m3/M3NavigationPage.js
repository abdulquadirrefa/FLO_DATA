const { buildLocators } = require('../../locators/m3/M3NavigationLocators');
const { getM3Frame }    = require('./m3Frames');

class M3NavigationPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {'QA'|'UAT'} [env]
   */
  constructor(page, env = 'UAT') {
    this.page    = page;
    this.env     = env;
    this.m3Frame = getM3Frame(page, env);

    Object.assign(this, buildLocators(this.m3Frame, env));
  }

  async selectGlobalIfQA() {
    await this.pageMenuBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.pageMenuBtn.click();

    await this.globalOption.waitFor({ state: 'visible', timeout: 10000 });
    await this.globalOption.click();
    console.log('✅ Global selected from page menu');
  }

  async openSearchWithCtrlR() {
    await this.page.bringToFront();
    await this.menuHeader.waitFor({ state: 'visible', timeout: 120000 });
    console.log('M3 Dashboard loaded');
    await this.page.waitForTimeout(5000);
    await this.page.keyboard.press('Control+r');
    await this.searchDialog.waitFor({ state: 'visible' });
  }

  async searchAndOpenOIS300() {
    await this.searchDialog.waitFor({ state: 'visible', timeout: 15000 });
    await this.searchDialog.click();
    await this.searchDialog.fill('OIS300');
    await this.page.keyboard.press('Enter');

    await this.ois300Title.waitFor({ state: 'visible', timeout: 15000 });
    console.log('OIS300 Customer Order. Open Toolbox - loaded successfully');
  }

  async openToolboxAndSelectCreateOrder() {
    await this._openToolboxAndClick(this.createOrderOption);
  }

  async openToolboxAndSelectUpdateOrder() {
    await this._openToolboxAndClick(this.updateOrderOption);
  }

  async _openToolboxAndClick(option) {
    await this.toolboxBtn.waitFor({ state: 'visible' });

    let attempts = 0;
    while (attempts < 3) {
      await this.toolboxBtn.click();

      try {
        await option.waitFor({ state: 'visible', timeout: 5000 });
        break;
      } catch {
        attempts++;
        console.log(`⚠️ Toolbox drawer did not open, retrying (${attempts}/3)...`);
        await this.page.waitForTimeout(2000);
      }
    }

    await option.click({ force: true });
    await this.pageTitle.waitFor({ state: 'visible', timeout: 45000 });
    console.log('✅ Customer Order Manager - loaded successfully');
  }

  async searchAndSelectCoInOIS300(coNumber) {
    await this.page.waitForTimeout(2000);

    // CO no search field is focused by default — fall back to the header filter input if not
    let searchInput = this.coSearchFocused;
    try {
      await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      console.log('⚠️ CO search field not focused, using header filter input...');
      searchInput = this.coSearchFallback;
      await searchInput.waitFor({ state: 'visible', timeout: 15000 });
      await searchInput.click();
    }

    await searchInput.fill(coNumber);
    await searchInput.press('Enter');
    console.log(`✅ CO searched in OIS300: ${coNumber}`);

    // Verify the searched CO is loaded on the first row
    let firstRowText = '';
    for (let i = 0; i < 30; i++) {
      if (await this.ois300FirstRow.isVisible()) {
        firstRowText = await this.ois300FirstRow.innerText();
        if (firstRowText.includes(coNumber)) break;
      }
      await this.page.waitForTimeout(1000);
    }

    if (!firstRowText.includes(coNumber)) {
      throw new Error(`❌ CO ${coNumber} not found on first row of OIS300. First row: "${firstRowText.trim()}"`);
    }
    console.log(`✅ CO ${coNumber} verified on first row`);

    await this.ois300FirstRow.click();
    console.log(`✅ CO ${coNumber} row selected`);
    await this.page.waitForTimeout(1000);
  }

  async clickAddLines() {
    await this.addLinesBtn.waitFor({ state: 'visible' });
    await this.addLinesBtn.click();
    console.log('✅ Add Lines clicked');

    console.log('⏳ Waiting 60 seconds for Add Lines to process...');
    await this.page.waitForTimeout(60000);
  }

  async clickReleaseForCosting() {
    await this.releaseForCostingEnabled.waitFor({ state: 'visible', timeout: 30000 });
    await this.releaseForCosting.click();
    console.log('✅ Release for Costing clicked');

    await this.page.waitForTimeout(5000);
  }
}

module.exports = { M3NavigationPage };
