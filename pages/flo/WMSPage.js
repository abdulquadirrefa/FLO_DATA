// ─────────────────────────────────────────────────────────────────────────────
// WMSPage.js
// POM for the WMS (Warehouse Management System) module.
// ─────────────────────────────────────────────────────────────────────────────

const { expect } = require('@playwright/test');
const { buildWMSLocators } = require('../../locators/flo/WMSLocators');

class WMSPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildWMSLocators(page));
  }

  // ── Navigate: Sidebar → WMS → Warehouse Requests → Production Requests ───
  async navigateToProductionRequests() {
    console.log('[WMS] Expanding WMS menu…');
    await this.wmsNavItem.waitFor({ state: 'visible', timeout: 15000 });
    await this.wmsNavItem.click();
    await this.page.waitForTimeout(800); // allow sub-menu to expand

    console.log('[WMS] Clicking Warehouse Requests…');
    await this.warehouseRequestsMenuItem.waitFor({ state: 'visible', timeout: 10000 });
    await this.warehouseRequestsMenuItem.click();
    await this.page.waitForTimeout(800);

    console.log('[WMS] Clicking Production Requests…');
    await this.productionRequestsLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.productionRequestsLink.click();
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log(`[WMS] Arrived at: ${this.page.url()}`);
  }

  // ── Verify the Production Requests page has loaded ───────────────────────
  async verifyRequestCategoryLabelVisible() {
    await expect(this.requestCategoryLabel).toBeVisible({ timeout: 15000 });
    console.log('[WMS] ✅ "Request Category:" label is displayed');
  }

  // ── Select an option from the Request Category dropdown ──────────────────
  /** @param {string} category e.g. "Sewing" */
  async selectRequestCategory(category) {
    await this.requestCategoryDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await this.requestCategoryDropdown.click();
    await this.page.waitForTimeout(400);

    const option = this.requestCategoryOption(category);
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    console.log(`[WMS] → Request Category set to: ${category}`);
  }

  // ── Fill the Schedule dropdown with a value from the data file ───────────
  /** @param {string} schedule */
  async fillSchedule(schedule) {
    await this.scheduleDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await this.scheduleDropdown.click();
    await this.page.waitForTimeout(400);

    await this.page.keyboard.type(schedule);
    await this.page.waitForTimeout(800);

    const option = this.scheduleOption(schedule);
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    console.log(`[WMS] → Schedule set to: ${schedule}`);
  }

  // ── Click the circular search button ──────────────────────────────────────
  async clickSearch() {
    await this.searchBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.searchBtn.click();
    await this.page.waitForTimeout(1500);
    console.log('[WMS] → Clicked Search');
  }

  // ── Verify the Status column for the schedule's row matches expectedStatus ──
  /**
   * @param {string} schedule
   * @param {string} expectedStatus e.g. "Requested" | "Partially Allocated"
   */
  async verifyStatus(schedule, expectedStatus) {
    const statusCell = this.statusCellInRow(schedule);
    await statusCell.waitFor({ state: 'visible', timeout: 15000 });
    const text = (await statusCell.textContent())?.trim();
    expect(text, `Expected status "${expectedStatus}" for schedule ${schedule}, got "${text}"`)
      .toMatch(new RegExp(expectedStatus, 'i'));
    console.log(`[WMS] ✅ Status "${expectedStatus}" confirmed for schedule ${schedule}`);
  }

  /** @param {string} schedule */
  async verifyStatusRequested(schedule) {
    await this.verifyStatus(schedule, 'Requested');
  }

  /** @param {string} schedule */
  async verifyStatusPartiallyAllocated(schedule) {
    await this.verifyStatus(schedule, 'Partially Allocated');
  }

  // ── Select an action from the row's Selection dropdown and click Proceed ──
  /**
   * @param {string} schedule
   * @param {string} action e.g. "Allocate"
   */
  async selectActionAndProceed(schedule, action) {
    const dropdown = this.selectionDropdownInRow(schedule);
    await dropdown.waitFor({ state: 'visible', timeout: 15000 });
    await dropdown.click();
    await this.page.waitForTimeout(400);

    const option = this.selectionActionOption(action);
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    console.log(`[WMS] → Selection set to: ${action}`);

    const proceedBtn = this.proceedBtnInRow(schedule);
    await proceedBtn.waitFor({ state: 'visible', timeout: 10000 });
    await proceedBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('[WMS] → Clicked Proceed');
  }

  // ── Wait for the Allocation page to load ─────────────────────────────────
  async waitForAllocationMethod() {
    await this.allocationMethodHeading.waitFor({ state: 'visible', timeout: 20000 });
    console.log('[WMS] ✅ "Allocation Method" is displayed');
  }

  // ── Verify the allocation table is present and return its row count ──────
  async getAllocationRowCount() {
    await this.allocationTableBody.waitFor({ state: 'visible', timeout: 15000 });
    const count = await this.allocationTableRows.count();
    expect(count, 'Expected at least one row in the Allocation table').toBeGreaterThan(0);
    console.log(`[WMS] Allocation table has ${count} row(s)`);
    return count;
  }

  // ── Check the row's checkbox at the given index, only if it is enabled ───
  /** @param {number} index 0-based row index */
  async selectAllocationRowIfEnabled(index) {
    const checkbox = this.allocationRowCheckbox(index);
    await checkbox.waitFor({ state: 'visible', timeout: 10000 });
    if (await checkbox.isEnabled()) {
      await checkbox.check();
      console.log(`[WMS] → Row [${index}] checkbox checked`);
    } else {
      console.log(`[WMS] Row [${index}] checkbox is disabled — skipping`);
    }
  }

  // ── Click the "Manual" allocation method button, only if it is enabled ───
  async clickManualIfEnabled() {
    await this.manualBtn.waitFor({ state: 'visible', timeout: 10000 });
    if (await this.manualBtn.isEnabled()) {
      await this.manualBtn.click();
      console.log('[WMS] → Clicked Manual');
    } else {
      console.log('[WMS] Manual button is disabled — skipping');
    }
  }

  // ── Manual Allocate Trims page ───────────────────────────────────────────

  async verifyManualAllocateTrimsHeading() {
    await this.manualAllocateTrimsHeading.waitFor({ state: 'visible', timeout: 20000 });
    console.log('[WMS] ✅ "Manual Allocate Trims" heading visible');
  }

  /** @param {string} schedule */
  async verifyScheduleOnManualPage(schedule) {
    await expect(this.page.getByText(schedule).first()).toBeVisible({ timeout: 10000 });
    console.log(`[WMS] ✅ Schedule "${schedule}" visible on Manual Allocate Trims page`);
  }

  async clickDownSquareButton() {
    await this.downSquareBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.downSquareBtn.click();
    await this.page.waitForTimeout(500);
    console.log('[WMS] → Clicked down-square button');
  }

  async waitForManualAllocateTable() {
    await this.manualAllocateTableContainer.waitFor({ state: 'visible', timeout: 20000 });
    // Wait for lot-rows (level-1) specifically — these only appear AFTER the
    // down-square button triggers the inventory load. The item-row (level-0)
    // exists on the page before the button click, so waiting for it is not enough.
    await this.page.locator('div.ant-table-body tr.ant-table-row-level-1')
      .first().waitFor({ state: 'visible', timeout: 20000 });
    const count = await this.page.locator('div.ant-table-body tr.ant-table-row-level-1').count();
    console.log(`[WMS] ✅ Manual Allocate table loaded — ${count} lot-row(s) visible`);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  // Reads a numeric value from the td at tdIndex within a row locator.
  // item-row (level-0) column map (0-based):
  //   td[8]  = Balance To Allocate
  //   td[12] = Allocated Quantity (plain text, updated as inventory checkboxes are ticked)
  async _getCellValue(rowLocator, tdIndex) {
    const text = (await rowLocator.locator('td').nth(tdIndex).textContent())?.trim().replace(/[^\d.-]/g, '') ?? '0';
    return parseFloat(text) || 0;
  }

  // Returns data-row-key values for inventory-rows (level-2) belonging to the
  // given lot-row (level-1), via DOM-order traversal until the next level-0/1 row.
  async _getInventoryRowKeys(lotRowLocator) {
    const parentKey = await lotRowLocator.getAttribute('data-row-key');
    return await this.page.evaluate((key) => {
      const container = document.querySelector('div.ant-table-body');
      const rows = [...(container ? container.querySelectorAll('tr.ant-table-row') : document.querySelectorAll('tr.ant-table-row'))];
      const idx = rows.findIndex(r => r.getAttribute('data-row-key') === key);
      if (idx === -1) return [];
      const keys = [];
      for (let i = idx + 1; i < rows.length; i++) {
        if (rows[i].classList.contains('ant-table-row-level-0') ||
            rows[i].classList.contains('ant-table-row-level-1')) break;
        const k = rows[i].getAttribute('data-row-key');
        if (k) keys.push(k);
      }
      return keys;
    }, parentKey);
  }

  // Expands a lot-row (level-1) by clicking its expand icon, then waits for
  // at least one inventory-row (level-2) to become visible.
  // Returns false (non-fatal) if the row never transitions to "expanded" —
  // some lots have no inventory underneath and their toggle is a no-op.
  async _expandLotRow(lotRowLocator) {
    const icon = lotRowLocator.locator('div.ant-table-row-expand-icon');
    await icon.scrollIntoViewIfNeeded();
    const isCollapsed = await icon.evaluate(el => el.classList.contains('ant-table-row-collapsed'));
    if (!isCollapsed) {
      console.log('[WMS] Lot row already expanded');
      return true;
    }

    // force: true bypasses Playwright's clipping/visibility check inside the
    // overflow-x:scroll div.ant-table-body container.
    await icon.click({ force: true });
    try {
      await expect(icon).toHaveClass(/ant-table-row-expanded/, { timeout: 8000 });
      await this.page.locator('div.ant-table-body tr.ant-table-row-level-2').first().waitFor({ state: 'visible', timeout: 8000 });
      await this.page.waitForTimeout(500);
      console.log('[WMS] → Lot row expanded — inventory rows loaded');
      return true;
    } catch {
      console.log('[WMS] Lot row did not expand (no inventory?) — skipping');
      return false;
    }
  }

  // Ticks inventory-row (level-2) checkboxes one at a time. After each click,
  // reads the PARENT item-row's (level-0) Allocated Quantity (td[12]) and
  // compares against balanceTarget. Returns true as soon as balance is reached.
  async _tickInventoryRowsUntilBalanced(itemRowLocator, lotRowLocator, balanceTarget) {
    const invKeys = await this._getInventoryRowKeys(lotRowLocator);
    console.log(`[WMS] ${invKeys.length} inventory-row(s) under this lot. Target: ${balanceTarget}`);

    for (const key of invKeys) {
      const invRow  = this.page.locator(`div.ant-table-body tr[data-row-key="${key}"]`);
      const checkbox = invRow.locator('input.ant-checkbox-input');

      const visible = await checkbox.isVisible().catch(() => false);
      if (!visible) {
        console.log(`[WMS] Inventory "${key}" — checkbox not visible, skipping`);
        continue;
      }
      if (await checkbox.isChecked()) {
        console.log(`[WMS] Inventory "${key}" — already checked, skipping`);
        continue;
      }

      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.click();
      await this.page.waitForTimeout(600);

      const allocated = await this._getCellValue(itemRowLocator, 12);
      console.log(`[WMS] "${key}" clicked → Item Allocated: ${allocated} / Target: ${balanceTarget}`);

      if (Math.abs(allocated - balanceTarget) < 0.01) {
        console.log('[WMS] ✅ Balance achieved');
        return true;
      }
    }
    return false;
  }

  // ── Main manual allocation orchestration ─────────────────────────────────
  // Table structure (3 levels):
  //   level-0  item-row    — already expanded after down-square click
  //   level-1  lot-rows    — we expand the LAST one first, then work upward
  //   level-2  inventory-rows — have checkboxes; ticking them updates item-row td[12]
  //
  // Non-fatal: if balance is never reached after all lot-rows, logs and returns
  // so the test continues to Confirm.
  async performManualAllocation() {
    const itemRow = this.page.locator('div.ant-table-body tr.ant-table-row-level-0').first();
    const balance = await this._getCellValue(itemRow, 8);
    console.log(`[WMS] Item row Balance to Allocate: ${balance}`);

    if (balance <= 0) {
      console.log('[WMS] Balance is 0 — nothing to allocate');
      return;
    }

    const lotRows = this.page.locator('div.ant-table-body tr.ant-table-row-level-1');
    const lotCount = await lotRows.count();
    console.log(`[WMS] ${lotCount} lot-row(s) available — processing last → first`);

    for (let i = lotCount - 1; i >= 0; i--) {
      const currentAllocated = await this._getCellValue(itemRow, 12);
      if (Math.abs(currentAllocated - balance) < 0.01) {
        console.log(`[WMS] ✅ Balance already achieved: ${currentAllocated}`);
        break;
      }

      console.log(`[WMS] Processing lot-row [${i}]…`);
      const lotRow = lotRows.nth(i);
      const expanded = await this._expandLotRow(lotRow);
      if (!expanded) {
        console.log(`[WMS] Lot-row [${i}] not expandable — trying previous lot-row`);
        continue;
      }

      const achieved = await this._tickInventoryRowsUntilBalanced(itemRow, lotRow, balance);

      if (achieved) {
        console.log(`[WMS] ✅ Balance achieved at lot-row [${i}]`);
        break;
      }
      console.log(`[WMS] Lot-row [${i}] exhausted without reaching balance — trying previous lot-row`);
    }

    const finalAllocated = await this._getCellValue(itemRow, 12);
    if (Math.abs(finalAllocated - balance) < 0.01) {
      console.log(`[WMS] ✅ Manual allocation complete: ${finalAllocated} / ${balance}`);
    } else {
      console.log(`[WMS] Balance not fully achieved (${finalAllocated}/${balance}) after all lot-rows — proceeding to Confirm`);
    }
  }

  // ── Confirm ──────────────────────────────────────────────────────────────

  async clickConfirm() {
    await this.confirmBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.confirmBtn.click();
    console.log('[WMS] → Clicked Confirm');
  }

  // After Confirm, either the success dialog (OK) appears, or — if the
  // allocated quantity didn't reach the full balance — a warning dialog
  // ("Materials has not been allocated ...") appears with a Yes prompt.
  async handleConfirmDialog() {
    const materialsDialog = this.materialsNotAllocatedText;
    const okBtn = this.confirmDialogOkBtn;

    await Promise.race([
      materialsDialog.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {}),
      okBtn.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {}),
    ]);

    if (await materialsDialog.isVisible().catch(() => false)) {
      console.log('[WMS] ⚠️ "Materials has not been allocated" dialog — clicking Yes');
      await this.modalYesBtn.click();
    } else {
      await okBtn.click();
      console.log('[WMS] → Clicked OK on confirm dialog');
    }
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { WMSPage };
