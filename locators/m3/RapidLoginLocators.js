function buildLocators(page) {
  return {
    // Rapid login page
    brandixSignInBtn:   page.getByRole('button', { name: /brandix/i }),

    // Microsoft login
    emailInput:         page.locator('input[type="email"]'),
    passwordInput:      page.locator('input[type="password"]'),
    nextBtn:            page.getByRole('button', { name: /next/i }),
    signInBtn:          page.getByRole('button', { name: /sign in/i }),
    staySignedInBtn:    page.getByRole('button', { name: /yes/i }),

    // MFA – number matching code element
    mfaDisplaySign:     page.locator('.display-sign, [class*="display-sign"], [data-bind*="displaySign"]').first(),
    mfaAuthenticatorText: page.getByText(/approve a request on my microsoft authenticator/i),
    staySignedInHeading: page.getByRole('heading', { name: /stay signed in/i }),

    // M3 company selector
    companySelectBtn:   page.locator('button.k-input-button[aria-label="Select"]'),
    companyOption:      page.locator('[role="option"]').first(),
    confirmYesBtn:      page.getByRole('button', { name: /yes/i }),
  };
}

module.exports = { buildLocators };
