// ─────────────────────────────────────────────────────────────────────────────
// FloLoginLocators.js
// FLO UAT redirects to Keycloak SSO for authentication.
// Keycloak login page standard field IDs are used here.
// ─────────────────────────────────────────────────────────────────────────────

function buildLoginLocators(page) {
  return {
    // Keycloak standard username field
    usernameInput: page.locator('#username'),

    // Keycloak standard password field
    passwordInput: page.locator('#password'),

    // Keycloak "Sign In" button — standard ID is #kc-login
    loginButton: page.locator('#kc-login').or(page.locator('input[value="Sign In"]')).first(),

    // Keycloak error message (shown on bad credentials)
    errorMessage: page.locator('#input-error, .alert-error, [class*="error"]').first(),
  };
}

module.exports = { buildLoginLocators };
