function buildLocators(page) {
  return {
    startBtn:        page.locator('button.ant-btn-primary.ant-btn-lg:has-text("Start")').first(),
    barcodeInput:    page.locator('input[type="text"]').first(),
    submitBtn:       page.locator('a.am-modal-button[role="button"]:has-text("Submit")').first(),
    entryDropdown:   page.locator('.ant-select-selection--single').first(),
    entryOption:     page.locator('.ant-select-dropdown-menu-item'),  // filter by text in method
    proceedBtn:      page.locator('button.antd-pro-app-src-pages-device-index-bottomBarButton:has-text("Proceed")').first(),
    enterBtn:        page.locator('button.antd-pro-app-src-pages-device-index-enterButton').first(),
    okBtn:           page.locator(
                       'a.am-modal-button[role="button"]:has-text("OK"), ' +
                       'a.am-modal-button[role="button"]:has-text("Ok"), ' +
                       'a.am-modal-button[role="button"]:has-text("ok"), ' +
                       '.am-modal-button:has-text("OK"), ' +
                       '.am-modal-button:has-text("Ok"), ' +
                       'button:has-text("OK"), ' +
                       'button:has-text("Ok")'
                     ).first(),
  };
}

module.exports = { buildLocators };
