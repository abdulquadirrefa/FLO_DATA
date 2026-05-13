// ─────────────────────────────────────────────────────────────────────────────
// FloSidebarPage.js  –  POM for the left navigation sidebar
// ─────────────────────────────────────────────────────────────────────────────

const { buildSidebarLocators } = require('../../locators/flo/FloSidebarLocators');

class FloSidebarPage {
  constructor(page) {
    this.page = page;
    Object.assign(this, buildSidebarLocators(page));
  }

  // ── Expand PPS section and click "Master PO Planning" ────────────────────
  async navigateToPPSMasterPO() {
    console.log('[Sidebar] Expanding PPS section…');

    // Click PPS to expand its sub-menu (it may already be expanded)
    try {
      await this.ppsNavItem.waitFor({ state: 'visible', timeout: 15000 });
      await this.ppsNavItem.click();
      console.log('[Sidebar] PPS clicked');
      await this.page.waitForTimeout(800); // allow animation to complete
    } catch (err) {
      console.warn('[Sidebar] PPS nav item not found via primary selector. Trying text fallback…');
      await this.page.getByText('PPS').first().click();
      await this.page.waitForTimeout(800);
    }

    console.log('[Sidebar] Clicking Master PO Planning…');
    try {
      await this.masterPOPlanningLink.waitFor({ state: 'visible', timeout: 10000 });
      await this.masterPOPlanningLink.click();
    } catch (err) {
      console.warn('[Sidebar] Master PO Planning link not found via primary selector. Trying text fallback…');
      await this.page.getByText('Master PO Planning').first().click();
    }

    await this.page.waitForLoadState('networkidle', { timeout: 60000 });
    console.log(`[Sidebar] Navigated to: ${this.page.url()}`);
  }

  // ── Navigate to any top-level sidebar item by visible text ───────────────
  async navigateTo(itemText) {
    console.log(`[Sidebar] Navigating to "${itemText}"…`);
    try {
      const item = this.navItemByText(itemText);
      await item.waitFor({ state: 'visible', timeout: 10000 });
      await item.click();
      await this.page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log(`[Sidebar] Arrived at: ${this.page.url()}`);
    } catch (err) {
      console.error(`[Sidebar] Could not navigate to "${itemText}": ${err.message}`);
      throw err;
    }
  }

  // ── Verify a sidebar item is visible (used in smoke tests) ───────────────
  async isSidebarItemVisible(itemText) {
    const item = this.navItemByText(itemText);
    const visible = await item.isVisible().catch(() => false);
    console.log(`[Sidebar] Item "${itemText}" visible: ${visible}`);
    return visible;
  }

}

module.exports = { FloSidebarPage };
