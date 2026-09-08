// ─────────────────────────────────────────────────────────────────────────────
// TMSPage.js
// POM for the TMS (Trims Management System) module.
// ─────────────────────────────────────────────────────────────────────────────

const { expect } = require('@playwright/test');
const { buildTMSLocators } = require('../../locators/flo/TMSLocators');

class TMSPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildTMSLocators(page));
  }

  // ── Sidebar: Dashboards → TMS ────────────────────────────────────────────
  async navigateToTMS() {
    console.log('[TMS] Expanding Dashboards menu…');
    await this.dashboardsNavItem.waitFor({ state: 'visible', timeout: 15000 });
    await this.dashboardsNavItem.click();
    await this.page.waitForTimeout(800); // allow sub-menu to expand

    console.log('[TMS] Clicking TMS…');
    await this.tmsNavItem.waitFor({ state: 'visible', timeout: 10000 });
    await this.tmsNavItem.click();
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log(`[TMS] Arrived at: ${this.page.url()}`);
  }

  // ── Type a value into Schedule Track (auto-scrolls the grid) ────────────
  /** @param {string} schedule  e.g. "35266" */
  async filterByScheduleTrack(schedule) {
    console.log(`[TMS] Setting Schedule Track → ${schedule}`);
    await this.scheduleTrackInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.scheduleTrackInput.fill(schedule);
  }

  // ── Click a sewing job div and return the popup window it opens ──────────
  /**
   * @param {string} jobId  e.g. "MSEW-J:71445-000"
   * @returns {Promise<import('@playwright/test').Page>}  the popup page
   */
  async clickSewingJob(jobId) {
    const jobDiv = this.sewingJobDiv(jobId);
    console.log(`[TMS] Waiting for sewing job div → ${jobId}`);
    await jobDiv.waitFor({ state: 'visible', timeout: 20000 });
    await jobDiv.scrollIntoViewIfNeeded();

    console.log(`[TMS] Clicking sewing job → ${jobId}`);
    const [popup] = await Promise.all([
      this.page.waitForEvent('popup'),
      jobDiv.click(),
    ]);

    console.log('[TMS] Popup opened, waiting for it to load…');
    await popup.waitForLoadState('domcontentloaded', { timeout: 60000 });
    console.log(`[TMS] Popup URL: ${popup.url()}`);
    return popup;
  }

  // ── Verify the "Create RM Request" page loaded in the new tab ───────────
  /** @param {import('@playwright/test').Page} popup */
  async verifyRMRequestPage(popup) {
    await expect(
      popup.getByRole('heading', { name: /Create RM Request/i })
        .or(popup.locator('h1, h2, .page-title').filter({ hasText: /Create RM Request/i }))
    ).toBeVisible({ timeout: 20000 });
    console.log('[TMS] ✅ "Create RM Request – Sewing Trims" page confirmed');
  }

  // ── Uncheck the header select-all checkbox on the RM Request table ───────
  /** @param {import('@playwright/test').Page} popup */
  async uncheckHeaderCheckbox(popup) {
    await popup.waitForLoadState('networkidle', { timeout: 30000 });
    await popup.locator('.ant-table-header').waitFor({ state: 'visible', timeout: 15000 });

    const checkbox = popup.locator('.ant-table-header .ant-checkbox-input').first();
    if (await checkbox.isChecked()) {
      await checkbox.uncheck({ force: true });
      console.log('[TMS] ✅ Header checkbox unchecked');
    } else {
      console.log('[TMS] Header checkbox was already unchecked — skipping');
    }
  }
}

module.exports = { TMSPage };
