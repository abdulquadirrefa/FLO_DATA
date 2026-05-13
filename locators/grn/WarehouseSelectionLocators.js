function buildLocators(page) {
  return {
    warehouseDropdown:    page.locator('.ant-select-selection').first(),
    warehouseOption:      page.locator('.ant-select-dropdown-menu-item, li.ant-select-dropdown-menu-item')
                              .filter({ hasText: 'B03 BLI_Watupitiwala  WH 1' }).first(),
    rawMaterialCard:      page.locator(
                            '.antd-pro-app-src-pages-select-warehouse-index-rawMaterial, ' +
                            '.antd-pro-app-src-pages-select-warehouse-index-typeText'
                          ).first(),
    sidebarReadyAnchor:   'a[href="/raw-material/delivery/pl-upload"]',
  };
}

module.exports = { buildLocators };
