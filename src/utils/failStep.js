const { test } = require('@playwright/test');

/**
 * Logs the failure, attaches a full-page screenshot to the Playwright HTML report, then rethrows.
 * Use inside a step's catch block: `catch (err) { await failStep(page, 'Step name', err); }`
 * @param {import('@playwright/test').Page} page
 * @param {string} stepName
 * @param {Error} err
 */
async function failStep(page, stepName, err) {
  console.error(`\n[FAIL] ${stepName}: ${err.message}`);
  const screenshot = await page.screenshot({ fullPage: true });
  await test.info().attach(`FAIL – ${stepName}`, {
    body:        screenshot,
    contentType: 'image/png',
  });
  throw err;
}

module.exports = { failStep };
