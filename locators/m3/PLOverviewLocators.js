function buildLocators(page) {
  return {
    navLink:          page.locator('a[href="/raw-material/delivery/pl-overview"]:has-text("PL Overview")').first(),
    pendingSection:   page.locator('.ant-col:has(h4:has-text("PENDING"))').first(),
    markInHouseBtn:   page.locator('button.ant-btn-primary:has-text("Mark as In-House")').first(),
    confirmYesBtn:    page.locator(
                        '.ant-popover-buttons button:has-text("Yes"), ' +
                        '.ant-popconfirm-buttons button:has-text("Yes"), ' +
                        'button.ant-btn-primary:has-text("Yes")'
                      ).first(),
    dialog:           page.locator('.ant-modal, .ant-modal-content').first(),
    autoGenOption:    page.locator('.ant-select-dropdown-menu-item, li.ant-select-dropdown-menu-item')
                          .filter({ hasText: 'Auto Generate' }).first(),
    markPendingBtn:   'button:has-text("Mark as Pending")',  // used with waitForSelector
    backBtn:          page.locator('button:has-text("BACK"), a:has-text("BACK")').first(),
  };
}

module.exports = { buildLocators };
