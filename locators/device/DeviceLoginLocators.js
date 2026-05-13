function buildLocators(page) {
  return {
    usernameInput: page.locator('input[id="username"]'),
    passwordInput: page.locator('input[id="password"]'),
    signInBtn:     page.getByRole('button', { name: 'Sign In', exact: true }),
  };
}

module.exports = { buildLocators };
