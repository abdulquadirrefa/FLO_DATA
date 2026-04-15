const { buildLocators } = require('../locators/GRNLoginLocators');

class GRNLogin {
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  async goto(url) {
    await this.page.bringToFront();
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async login(username, password) {
    const currentUrl = this.page.url();
    console.log('>>> Current URL after goto:', currentUrl);

    await this.usernameInput.waitFor({ state: 'visible', timeout: 15000 });
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

module.exports = { GRNLogin };
