const { buildLocators } = require('../../locators/grn/GRNLoginLocators');

class GRNLoginPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  /** @param {string} url */
  async goto(url) {
    await this.page.bringToFront();
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    const currentUrl = this.page.url();
    console.log('>>> Current URL after goto:', currentUrl);

    await this.usernameInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.usernameInput.fill(username);
    console.log('>>> Username filled');

    await this.passwordInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.passwordInput.fill(password);
    console.log('>>> Password filled');

    await this.signInBtn.click();

    await this.page.waitForLoadState('networkidle', { timeout: 60000 });
    console.log('>>> Login complete, current URL:', this.page.url());
  }
}

module.exports = { GRNLoginPage };
