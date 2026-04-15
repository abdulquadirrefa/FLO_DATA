/**
 * @param {import('@playwright/test').FrameLocator|import('@playwright/test').Locator} m3Frame
 * @param {'QA'|'UAT'} env
 */
function buildLocators(m3Frame, env) {
  return {
    menuHeader:        m3Frame.locator('span.gvWidgetHeaderTitle').filter({ hasText: 'Interfaces and SDKs' }),
    searchDialog:      m3Frame.locator('input#cmdText[placeholder="Search and Start"]'),
    ois300Title:       env === 'QA'
                         ? m3Frame.locator('span.tabTitle').filter({ hasText: 'Customer Order. Open Toolbox' })
                         : m3Frame.locator('span.tabTitle').filter({ hasText: 'OIS300 Customer Order. Open Toolbox' }),
    toolboxBtn:        m3Frame.locator('#toolBoxBtnCont > button.inforIconButton'),
    createOrderOption: m3Frame.locator('span.Shortcut.inforLabel.noColon').filter({ hasText: 'Create Order' }),
    addLinesBtn:       m3Frame.locator('button#addButton'),
    pageTitle:         m3Frame.locator('span.tabTitle').filter({ hasText: 'Customer Order Manager' }),
    releaseForCosting: m3Frame.locator('button#submitButton'),
    releaseForCostingEnabled: m3Frame.locator('button#submitButton:not([disabled])'),
    // QA only — Global menu selector
    pageMenuBtn:       m3Frame.locator('button.inforIconButton.gvPageMenu.gvButtonPageMenu'),
    globalOption:      m3Frame.locator('a').filter({ hasText: /^Global$/ }),
  };
}

module.exports = { buildLocators };
