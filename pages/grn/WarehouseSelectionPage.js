const { buildLocators } = require('../../locators/grn/WarehouseSelectionLocators');

class WarehouseSelectionPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  async selectWarehouse() {
    console.log('🏭 Selecting warehouse...');

    await this.warehouseDropdown.click();
    await this.page.waitForSelector('.ant-select-dropdown', { timeout: 15000 });

    await this.warehouseOption.waitFor({ state: 'visible', timeout: 15000 });
    await this.warehouseOption.click();
    console.log('✅ Warehouse selected: B03 BLI_Watupitiwala WH 1');
  }

  async clickRawMaterialWarehouse() {
    await this.rawMaterialCard.click();
    console.log('✅ Raw Material Warehouse card clicked');

    await this.page.waitForSelector(this.sidebarReadyAnchor, { timeout: 30000 });
    console.log('✅ Sidebar loaded');
  }
}

module.exports = { WarehouseSelectionPage };
