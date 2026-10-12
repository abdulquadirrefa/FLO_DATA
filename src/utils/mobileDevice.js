// Separate Edge window with a phone-sized viewport — the GRN app's handheld scanner UI.

const IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

/**
 * Launches a headed Edge browser with an iPhone 14 viewport and user agent.
 * The caller closes `edgeBrowser` when the device session is done.
 * @param {import('@playwright/test').Browser} browser  any browser from the test (used for its browser type)
 * @param {{ ignoreHTTPSErrors?: boolean }} [opts]
 * @returns {Promise<{ edgeBrowser: import('@playwright/test').Browser, deviceContext: import('@playwright/test').BrowserContext }>}
 */
async function launchMobileDevice(browser, { ignoreHTTPSErrors = true } = {}) {
  const edgeBrowser = await browser.browserType().launch({
    channel:  'msedge',
    headless: false,
  });

  const deviceContext = await edgeBrowser.newContext({
    viewport:  { width: 390, height: 844 },   // iPhone 14 mobile dimensions
    userAgent: IPHONE_USER_AGENT,
    ignoreHTTPSErrors,
  });

  return { edgeBrowser, deviceContext };
}

module.exports = { launchMobileDevice, IPHONE_USER_AGENT };
