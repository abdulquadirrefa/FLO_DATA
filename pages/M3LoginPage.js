const { buildLocators } = require('../locators/M3LoginLocators');

class M3LoginPage {
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  async goto(url) {
    await this.page.bringToFront();
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async login(email, password) {
    const currentUrl = this.page.url();
    console.log('>>> M3 current URL after goto:', currentUrl);

    // If already redirected to M3 (SSO session reused from Rapid login)
    if (currentUrl.includes('/infor/') || currentUrl.includes('erp-qa-m3-iso')) {
      console.log('>>> SSO session reused, skipping login');
      await this.page.waitForLoadState('networkidle', { timeout: 60000 });
      return;
    }

    await this.emailInput.waitFor({ state: 'visible' });
    await this.emailInput.fill(email);

    await this.passwordInput.waitFor({ state: 'visible' });
    await this.passwordInput.fill(password);
    await this.signInBtn.click();

    await this.page.waitForLoadState('networkidle', { timeout: 60000 });
  }
}

module.exports = { M3LoginPage };
