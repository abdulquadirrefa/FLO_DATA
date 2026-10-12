// Frame resolution shared by the M3 page objects.
//   QA  — the M3 shell is the top-level page; each SDK app is one iframe deep.
//   UAT — the M3 shell sits in an iframe on the ISO host; each SDK app is a further iframe inside it.

/**
 * The M3 shell (menus, tabs, toolbox).
 * @param {import('@playwright/test').Page} page
 * @param {'QA'|'UAT'} env
 * @returns {import('@playwright/test').Locator|import('@playwright/test').FrameLocator}
 */
function getM3Frame(page, env) {
  return env === 'QA'
    ? page.locator('body')
    : page.frameLocator('iframe').first();
}

/**
 * The iframe of one M3 SDK app.
 * @param {import('@playwright/test').Page} page
 * @param {'QA'|'UAT'} env
 * @param {string} sdkPath part of the SDK iframe's src, e.g. 'customer-order-sdk'
 * @returns {import('@playwright/test').FrameLocator}
 */
function getM3FormFrame(page, env, sdkPath) {
  const isoHost = env === 'QA' ? 'erp-qa-m3-iso-ec2' : 'sin1auwm3iso001';

  return env === 'QA'
    ? page.frameLocator(`iframe[src*="${sdkPath}"]`)
    : page.frameLocator(`iframe[src*="${isoHost}"]`)
          .frameLocator(`iframe[src*="${sdkPath}"]`);
}

module.exports = { getM3Frame, getM3FormFrame };
