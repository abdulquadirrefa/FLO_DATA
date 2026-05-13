const { buildLocators } = require('../../locators/m3/M3NavigationLocators');

class M3NavigationPage {
  constructor(page, env = 'UAT') {
    this.page = page;
    this.env  = env;

    this.m3Frame = env === 'QA'
      ? page.locator('body')
      : page.frameLocator('iframe').first();

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
    await this.toolboxBtn.waitFor({ state: 'visible' });

    let attempts = 0;
    while (attempts < 3) {
      await this.toolboxBtn.click();

      try {
        await this.createOrderOption.waitFor({ state: 'visible', timeout: 5000 });
        break;
      } catch {
        attempts++;
        console.log(`⚠️ Toolbox drawer did not open, retrying (${attempts}/3)...`);
        await this.page.waitForTimeout(2000);
      }
    }

    await this.createOrderOption.click({ force: true });
    await this.pageTitle.waitFor({ state: 'visible', timeout: 45000 });
    console.log('✅ Customer Order Manager - loaded successfully');
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
