// ─────────────────────────────────────────────────────────────────────────────
// FLO UAT – Login Credentials & App Config
// Update these values if credentials change.
// ─────────────────────────────────────────────────────────────────────────────

const FLO_CONFIG = {
  env:      'QA',    // ← change to 'UAT' to run against UAT

  get baseURL() {
    return this.env === 'QA'
      ? 'https://flo.qa.brandixlk.org/'
      : 'https://flo.uat.brandixlk.org/';
  },

  email:    'abdulq',
  password: 'Ps4bestgame@7',

  defaultPlant: 'B03-BLI-Wathupitiwala',
};

module.exports = { FLO_CONFIG };
