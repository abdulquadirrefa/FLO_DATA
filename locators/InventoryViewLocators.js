function buildLocators(page) {
  return {
    inventorySubmenu:  page.locator('.ant-menu-submenu-title:has-text("Inventory")').first(),
    inventoryViewLink: page.locator('a[href="/raw-material/inventory/inventory-view"]:has-text("Inventory View")').first(),
    settingsIcon:      page.locator('.anticon-setting.ant-dropdown-trigger').first(),
    poNumberCheckbox:  page.locator('#purchaseOrderNumber').first(),
    searchInput:       page.locator('#advanced_search_purchaseOrderNumber, input[placeholder="Enter a PO Number"]').first(),
    searchBtn:         page.locator('button[type="submit"]:has-text("Search")').first(),
    tableRow:          '.ant-table-row',                    // used with waitForSelector
    tableHeaders:      page.locator('th.ant-table-row-cell-break-word .ant-table-column-title'),
    tableRows:         page.locator('.ant-table-row.ant-table-row-level-0:not(.ant-table-fixed-row)'),
  };
}

module.exports = { buildLocators };
