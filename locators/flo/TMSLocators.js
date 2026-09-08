// ─────────────────────────────────────────────────────────────────────────────
// TMSLocators.js
// Locators for the TMS (Trims Management System) module – Sewing Trims dashboard.
// ─────────────────────────────────────────────────────────────────────────────

function buildTMSLocators(page) {
  // The TMS dashboard is rendered inside an iframe; all dashboard elements
  // must be located through the frame context, not the main page.
  const frame = page.frameLocator('iframe[name="react-post-iframe-0"]');

  return {
    // ── Sidebar navigation (main page) ───────────────────────────────────────
    dashboardsNavItem: page.getByText('Dashboards'),
    tmsNavItem:        page.getByText('TMS'),

    // ── TMS dashboard filters (inside iframe) ────────────────────────────────
    scheduleTrackInput: frame.locator('input.form-control.integer'),

    /** @param {string} jobId  e.g. "MSEW-J:71445-000" */
    sewingJobDiv: (jobId) => frame.locator(`[id="${jobId}"]`),
  };
}

module.exports = { buildTMSLocators };
