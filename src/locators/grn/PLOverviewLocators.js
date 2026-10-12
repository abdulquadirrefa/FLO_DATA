/** @param {import('@playwright/test').Page} page */
function buildLocators(page) {
  return {
    navLink:          page.locator('a[href="/raw-material/delivery/pl-overview"]:has-text("PL Overview")').first(),
    pendingSection:   page.locator('.ant-col:has(h4:has-text("PENDING"))').first(),
    markInHouseBtn:   page.locator('button.ant-btn-primary:has-text("Mark as In-House")').first(),
    // Visible only — closed dialogs (Confirm Selection, Print Barcodes) can stay in the DOM hidden
    confirmYesBtn:    page.locator(
                        '.ant-popover-buttons button:has-text("Yes"), ' +
                        '.ant-popconfirm-buttons button:has-text("Yes"), ' +
                        'button.ant-btn-primary:has-text("Yes"), ' +
                        '.ant-modal-confirm-btns button:has-text("Yes")'
                      ).filter({ visible: true }).first(),
    dialog:           page.locator('.ant-modal').filter({ visible: true }).first(),
    autoGenOption:    page.locator('.ant-select-dropdown-menu-item, li.ant-select-dropdown-menu-item')
                          .filter({ hasText: 'Auto Generate' }).first(),
    markPendingBtn:   'button:has-text("Mark as Pending")',  // used with waitForSelector
    backBtn:          page.locator('button:has-text("BACK"), a:has-text("BACK")').first(),

    // ── Select all lines + consolidated barcode print (detail view) ──
    headerCheckbox:     page.locator('thead .ant-checkbox-input').first(),
    selectAllPagesBtn:  page.locator('button:has-text("Select All Pages")').filter({ visible: true }).first(),
    selectedLabel:      page.getByText(/\d+ items? (are|is) Selected/i).first(),          // "3 items are Selected"
    printBtn:           page.locator('button:has-text("PRINT")').first(),
    printModal:         page.locator('.ant-modal').filter({ hasText: 'Print Barcodes' }).filter({ visible: true }).first(),
    selectOption:       page.locator('.ant-select-dropdown-menu-item').filter({ visible: true }),
    loadingSpinner:     page.locator('.ant-spin-spinning').filter({ visible: true }),
  };
}

module.exports = { buildLocators };
