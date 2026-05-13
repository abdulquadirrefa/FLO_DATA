const { buildLocators } = require('../../locators/m3/RapidLoginLocators');

class RapidLoginPage {
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
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

    // ── "Verify your identity" method selector (appears sometimes) ─
    try {
      await this.mfaAuthenticatorText.waitFor({ state: 'visible', timeout: 6000 });
      await this.mfaAuthenticatorText.click();
      console.log('🔐  Selected: Approve via Microsoft Authenticator');
    } catch {
      // Selector page did not appear — continue
    }

    // ── MFA check ─────────────────────────────────────────────────
    // If still on Microsoft after 5s, MFA is required
    const redirectedBeforeMFA = await this.page.waitForURL(
      url => !url.toString().includes('login.microsoftonline.com'),
      { timeout: 5000 }
    ).then(() => true).catch(() => false);

    if (!redirectedBeforeMFA) {
      // Try to extract the number shown on screen
      let mfaCode = '';
      try {
        const text = await this.mfaDisplaySign.textContent({ timeout: 3000 });
        if (text?.trim()) mfaCode = text.trim();
      } catch {
        // code element not present
      }

      console.log('');
      console.log('🔐 ============================================');
      console.log('🔐  MFA REQUIRED');
      console.log('🔐  Open your Microsoft Authenticator app');
      if (mfaCode) {
        console.log(`🔐  Tap the number: ${mfaCode}`);
      } else {
        console.log('🔐  Approve the sign-in request on your phone');
      }
      console.log('🔐  Waiting up to 90 seconds...');
      console.log('🔐 ============================================');
      console.log('');

      // Wait for MFA approval — race between redirect and "Stay signed in?" heading
      await Promise.race([
        this.page.waitForURL(
          url => !url.toString().includes('login.microsoftonline.com'),
          { timeout: 90000 }
        ).catch(() => {}),
        this.staySignedInHeading
          .waitFor({ state: 'visible', timeout: 90000 }).catch(() => {}),
      ]);

      console.log('✅ MFA approved, continuing...');
    }

    // ── Stay signed in prompt ──────────────────────────────────────
    // Handle regardless of whether MFA was shown — prompt can appear any time
    if (this.page.url().includes('login.microsoftonline.com')) {
      try {
        await this.staySignedInBtn.waitFor({ state: 'visible', timeout: 8000 });
        await this.staySignedInBtn.click();
        console.log('✅ Clicked "Yes" on Stay signed in prompt');
      } catch {
        // Prompt didn't appear — continue
      }
    }

    // ── Gate: ensure we've fully left Microsoft before continuing ──
    await this.page.waitForURL(
      url => !url.toString().includes('login.microsoftonline.com'),
      { timeout: 30000 }
    ).catch(() => {});
  }

  async selectFirstCompany() {
    await this.companySelectBtn.waitFor({ state: 'visible', timeout: 30000 });
    await this.companySelectBtn.click();

    await this.companyOption.waitFor({ state: 'visible' });
    await this.companyOption.click();

    await this.confirmYesBtn.waitFor({ state: 'visible' });
    await this.confirmYesBtn.click();
  }
}

module.exports = { RapidLoginPage };