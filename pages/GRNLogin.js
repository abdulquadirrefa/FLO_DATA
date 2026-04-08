class GRNLogin {
  constructor(page) {
    this.page = page;
  }

  async goto(url) {
    await this.page.bringToFront();
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async login(username, password) {
  const currentUrl = this.page.url();
  console.log('>>> Current URL after goto:', currentUrl);

  // Step 1: Fill username and click Sign In
  const usernameInput = this.page.locator('input[id="username"]');
  await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
  await usernameInput.fill(username);
  console.log('>>> Username filled');

  // Step 2: Fill password (visible on same page for Keycloak)
  const passwordInput = this.page.locator('input[id="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
  await passwordInput.fill(password);
  console.log('>>> Password filled');

  // Step 3: Click Sign In
  await this.page.getByRole('button', { name: 'Sign In', exact: true }).click();

  await this.page.waitForLoadState('networkidle', { timeout: 60000 });
  console.log('>>> Login complete, current URL:', this.page.url());
}
}

module.exports = { GRNLogin };