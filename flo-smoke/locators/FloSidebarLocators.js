// ─────────────────────────────────────────────────────────────────────────────
// FloSidebarLocators.js
// Selectors for the left navigation sidebar visible after login.
//
// From the screenshot the sidebar contains top-level items:
//   Dashboards, User Management, MDM, PMS, SMS, PPS, Planning, Cutting,
//   Sewing Job System, Work Study, Reports, PR Cut, PTS
//
// Assumptions:
//   - Nav items are rendered as <a> tags or elements with role="menuitem" /
//     role="treeitem" containing the text.
//   - Expandable items get an additional child list once clicked.
//   - Exact class names are unknown without the HTML — selectors fall back to
//     text-based matching which is robust for content-driven navigation.
// ─────────────────────────────────────────────────────────────────────────────

function buildSidebarLocators(page) {
  return {
    // Hamburger / menu toggle (three-line icon top-left)
    menuToggle: page.locator(
      'button[class*="menu"], button[class*="toggle"], ' +
      '[class*="hamburger"], [class*="sidebar-toggle"], mat-icon:has-text("menu")'
    ).first(),

    // Top-level "PPS" nav item
    ppsNavItem: page.getByRole('link', { name: /^PPS$/i })
      .or(page.locator('a, li, span').filter({ hasText: /^PPS$/ }).first())
      .or(page.locator('[class*="nav"] >> text=PPS').first()),

    // Sub-item "Master PO Planning" inside PPS
    masterPOPlanningLink: page.getByRole('link', { name: /Master PO Planning/i })
      .or(page.locator('a, li, span').filter({ hasText: /Master PO Planning/i }).first()),

    // Generic helper – any top-level nav item by label
    navItemByText: (text) =>
      page.locator('a, li, span, div').filter({ hasText: new RegExp(`^${text}$`, 'i') }).first(),

    // Active / highlighted nav item
    activeNavItem: page.locator('[class*="active"], [class*="selected"], [aria-current="page"]').first(),
  };
}

module.exports = { buildSidebarLocators };
