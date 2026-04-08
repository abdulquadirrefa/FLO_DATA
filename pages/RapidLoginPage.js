class RapidLoginPage {
  constructor(page) {
    this.page = page;

    // Rapid login
    this.brandixSignInBtn   = page.getByRole('button', { name: /brandix/i });

    // Microsoft login
    this.emailInput         = page.locator('input[type="email"]');
    this.passwordInput      = page.locator('input[type="password"]');
    this.nextBtn            = page.getByRole('button', { name: /next/i });
    this.signInBtn          = page.getByRole('button', { name: /sign in/i });
    this.staySignedInBtn    = page.getByRole('button', { name: /yes/i });

    // M3 company selector
    this.companyDropdown    = page.locator('[class*="company"], [class*="dropdown"]').first();
    this.firstCompanyOption = page.locator('[role="option"], [class*="option"]').first();
    this.confirmYesBtn      = page.getByRole('button', { name: /yes/i });
  }

  async goto(url) {
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async clickBrandixSignIn() {
    await this.brandixSignInBtn.waitFor({ state: 'visible' });
    await this.brandixSignInBtn.click();
  }

  async completeMicrosoftLogin(email, password) {
    // Enter email
    await this.emailInput.waitFor({ state: 'visible' });
    await this.emailInput.fill(email);
    await this.nextBtn.click();

    // Enter password
    await this.passwordInput.waitFor({ state: 'visible' });
    await this.passwordInput.fill(password);
    await this.signInBtn.click();

    // ── MFA check ─────────────────────────────────────────────────
    try {
      await this.page.waitForSelector(
        '[data-viewid="PhoneAppOTP"], #idDiv_SAOTCAS_Section, [data-bind*="appName"]',
        { timeout: 8000 }
      );

      // Try to extract the number shown on screen
      const codeLocators = [
        '[data-viewid="PhoneAppOTP"] .display-sign',
        '#idDiv_SAOTCAS_Section .display-sign',
        '.display-sign',
      ];

      let mfaCode = '';
      for (const selector of codeLocators) {
        try {
          mfaCode = await this.page.locator(selector).first().textContent({ timeout: 3000 });
          if (mfaCode?.trim()) break;
        } catch {
          // try next selector
        }
      }

      console.log('');
      console.log('🔐 ============================================');
      console.log('🔐  MFA REQUIRED');
      console.log('🔐  Open your Microsoft Authenticator app');
      if (mfaCode?.trim()) {
        console.log(`🔐  Tap the number: ${mfaCode.trim()}`);
      } else {
        console.log('🔐  Approve the sign-in request on your phone');
      }
      console.log('🔐  Waiting up to 90 seconds...');
      console.log('🔐 ============================================');
      console.log('');

      // Wait until MFA approved — Microsoft redirects away
      await this.page.waitForURL(
  url => !url.toString().includes('login.microsoftonline.com'),
  { timeout: 90000 }
);

      console.log('✅ MFA approved, continuing...');

    } catch {
      // No MFA prompt — UAT or cached session, continue normally
    }

    // ── Stay signed in prompt ──────────────────────────────────────
    try {
      await this.staySignedInBtn.waitFor({ state: 'visible', timeout: 30000 });
      await this.staySignedInBtn.click();
    } catch {
      // Prompt didn't appear — continue
    }

    // ── Gate: ensure we've fully left Microsoft before continuing ──
   // ── Gate: ensure we've fully left Microsoft before continuing ──
try {
  await this.page.waitForURL(
    url => !url.toString().includes('login.microsoftonline.com'),
    { timeout: 30000 }
  );
} catch {
  // Already redirected away from Microsoft — continue
}
  }

  async selectFirstCompany() {
    const companyDropdown = this.page.locator('button.k-input-button[aria-label="Select"]');
    await companyDropdown.waitFor({ state: 'visible', timeout: 30000 });
    await companyDropdown.click();

    const firstOption = this.page.locator('[role="option"]').first();
    await firstOption.waitFor({ state: 'visible' });
    await firstOption.click();

    await this.page.getByRole('button', { name: /yes/i }).waitFor({ state: 'visible' });
    await this.page.getByRole('button', { name: /yes/i }).click();
  }
}

module.exports = { RapidLoginPage };