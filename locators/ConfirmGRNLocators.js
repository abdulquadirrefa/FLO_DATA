function buildLocators(page) {
  return {
    deliverySubmenu:      page.locator('.ant-menu-submenu-title:has-text("Delivery")').first(),
    confirmGRNLink:       page.locator('a[href="/raw-material/delivery/confirm-filtered"]:has-text("Confirm GRN")').first(),
    poInput:              page.locator('#poNo, input[placeholder="Enter Valid PO number to create a PL"]').first(),
    nextBtn:              page.locator('button:has-text("Next")').first(),
    headerCheckbox:       page.locator('thead .ant-checkbox-input').first(),
    updateM3Btn:          page.locator('button:has-text("Update M3")').first(),
    completedTab:         page.locator('label.ant-radio-button-wrapper:has-text("Completed")').first(),
    pendingTab:           page.locator('label.ant-radio-button-wrapper:has-text("Pending")').first(),
    tableRows:            page.locator('.ant-table-row.editable-row.ant-table-row-level-0'),
    goBackBtn:            page.locator('button:has-text("Go Back")').first(),
  };
}

module.exports = { buildLocators };
