class WarehouseSelectionPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async selectWarehouse() {
    console.log('🏭 Selecting warehouse...');

    await this.page.locator('.ant-select-selection').first().click();
    await this.page.waitForSelector('.ant-select-dropdown', { timeout: 15000 });

    const option = this.page
      .locator('.ant-select-dropdown-menu-item, li.ant-select-dropdown-menu-item')
      .filter({ hasText: 'B03 BLI_Watupitiwala  WH 1' })
      .first();
    await option.waitFor({ state: 'visible', timeout: 15000 });
    await option.click();
    console.log('✅ Warehouse selected: B03 BLI_Watupitiwala WH 1');
  }

  async clickRawMaterialWarehouse() {
    await this.page
      .locator('.antd-pro-app-src-pages-select-warehouse-index-rawMaterial, .antd-pro-app-src-pages-select-warehouse-index-typeText')
      .first()
      .click();
    console.log('✅ Raw Material Warehouse card clicked');

    // Wait for sidebar to load
    await this.page.waitForSelector('a[href="/raw-material/delivery/pl-upload"]', { timeout: 30000 });
    console.log('✅ Sidebar loaded');
  }
}

module.exports = { WarehouseSelectionPage };