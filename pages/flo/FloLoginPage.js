// ─────────────────────────────────────────────────────────────────────────────
// FloLoginPage.js  –  POM for FLO UAT login (via Keycloak SSO)
// Flow: https://flo.uat.brandixlk.org → redirects to Keycloak → back to FLO
// ─────────────────────────────────────────────────────────────────────────────

const { buildLoginLocators } = require('../../locators/flo/FloLoginLocators');

class FloLoginPage {
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLoginLocators(page));
  }

  // ── Navigate to FLO (will redirect to Keycloak) ───────────────────────────
  async goto(baseURL) {
    console.log(`[Login] Navigating to ${baseURL}`);
    await this.page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    // Wait for the Keycloak redirect to settle
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log(`[Login] Landed on: ${this.page.url()}`);
  }

  // ── Fill Keycloak form and submit ─────────────────────────────────────────
  // Single-step Keycloak: username + password on the same page → Sign In
  async login(username, password) {
    console.log(`[Login] Waiting for username field (#username)…`);
    await this.usernameInput.waitFor({ state: 'visible', timeout: 20000 });

    console.log(`[Login] Filling username: ${username}`);
    await this.usernameInput.fill(username);

    console.log('[Login] Waiting for password field (#password)…');
    await this.passwordInput.waitFor({ state: 'visible', timeout: 10000 });

    console.log('[Login] Filling password');
    await this.passwordInput.fill(password);

    console.log('[Login] Clicking Sign In button');
    await this.loginButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.loginButton.click();

    console.log('[Login] Waiting for redirect back to FLO…');
    // Wait up to 60s for the Keycloak → FLO redirect to complete
    await this.page.waitForURL(
      (url) => url.hostname.startsWith('flo.') && url.hostname.endsWith('brandixlk.org'),
      { timeout: 60000 }
    ).catch(async () => {
      console.warn('[Login] waitForURL timed out – current URL:', this.page.url());
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    });

    console.log(`[Login] Post-login URL: ${this.page.url()}`);
  }

  // ── Confirm we are back on the FLO app (not Keycloak) ────────────────────
  async isLoginSuccessful() {
    const url = this.page.url();
    const success = url.includes('flo.uat.brandixlk.org') && !url.includes('keycloak');
    console.log(`[Login] Success check – URL: ${url} → ${success ? 'PASS' : 'FAIL'}`);
    return success;
  }

}

module.exports = { FloLoginPage };
