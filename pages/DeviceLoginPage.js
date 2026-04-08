class DeviceLoginPage {
  constructor(page) {
    this.page          = page;
    this.usernameInput = page.locator('input[id="username"]');
    this.passwordInput = page.locator('input[id="password"]');
    this.signInBtn     = page.getByRole('button', { name: 'Sign In', exact: true });
  }

  /** @param {string} url */
  async goto(url) {
    await this.page.bringToFront();
    await this.page.goto(url, { waitUntil: 'networkidle' });
    console.log('>>> Device browser current URL:', this.page.url());
  }

  /**
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    console.log('>>> Device login as:', username);
    await this.usernameInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.usernameInput.fill(username);

    await this.passwordInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.passwordInput.fill(password);

    await this.signInBtn.click();
    await this.page.waitForLoadState('networkidle', { timeout: 60000 });
    console.log('>>> Device login complete, URL:', this.page.url());
  }
}

module.exports = { DeviceLoginPage };