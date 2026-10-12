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
    updateOrderOption: m3Frame.locator('span.Shortcut.inforLabel.noColon').filter({ hasText: /Update order/i }),
    // OIS300 list — CO no search field is focused by default when OIS300 opens
    coSearchFocused:   m3Frame.locator('input:focus'),
    coSearchFallback:  m3Frame.locator('.slick-headerrow input, .slick-headerrow-columns input').first(),
    ois300FirstRow:    m3Frame.locator('.slick-viewport .slick-row').first(),
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
