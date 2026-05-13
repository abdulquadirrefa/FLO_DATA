function buildLocators(page) {
  return {
    emailInput:    page.locator('input[type="email"]'),
    passwordInput: page.locator('input[type="password"]'),
    signInBtn:     page.getByRole('button', { name: 'Sign in', exact: true }),
  };
}

module.exports = { buildLocators };
