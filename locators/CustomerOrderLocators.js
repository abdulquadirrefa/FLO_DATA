/**
 * @param {import('@playwright/test').FrameLocator|import('@playwright/test').Locator} m3Frame
 * @param {import('@playwright/test').FrameLocator} m3FormFrame
 */
function buildLocators(m3Frame, m3FormFrame) {
  return {
    // ── Page ready indicator ──────────────────────────────────────
    pageTitle:          m3Frame.locator('span.tabTitle').filter({ hasText: 'Customer Order Manager' }),

    // ── Facility ──────────────────────────────────────────────────
    facilityInput:      m3FormFrame.locator('input[role="combobox"][placeholder="- SELECT -"]').first(),
    facilityOption:     m3FormFrame.locator('[role="option"]').first(),

    // ── Style search ──────────────────────────────────────────────
    styleSearchBtn:     m3FormFrame.locator('button.grid-select.k-icon.k-i-zoom'),
    styleDialog:        m3FormFrame.locator('.k-window, [role="dialog"]').filter({ hasText: 'Search Style' }),

    // ── Style dialog fields ───────────────────────────────────────
    buyerDivisionInput: m3FormFrame.locator('.k-window, [role="dialog"]').filter({ hasText: 'Search Style' }).locator('input').first(),
    m3StyleInput:       m3FormFrame.locator('.k-window, [role="dialog"]').filter({ hasText: 'Search Style' }).locator('input').nth(1),
    searchBtn:          m3FormFrame.locator('.k-window, [role="dialog"]').filter({ hasText: 'Search Style' }).locator('button#searchBtn, button:has-text("Search")'),
    firstDataRow:       m3FormFrame.locator('.k-window, [role="dialog"]').filter({ hasText: 'Search Style' }).locator('td[role="gridcell"][aria-colindex="1"]').first(),
    selectBtn:          m3FormFrame.locator('.k-window, [role="dialog"]').filter({ hasText: 'Search Style' }).locator('button#selectBtn, button:has-text("Select")'),
    buyerDivisionOption: m3FormFrame.locator('[role="option"]').first(),

    // ── Date ──────────────────────────────────────────────────────
    calendarToggle:     m3FormFrame.locator('#id_requestedDeliveryDate_header span.k-select[title="Toggle calendar"]'),

    // ── Form fields ───────────────────────────────────────────────
    cpoNumberInput:     m3FormFrame.locator('input[maxlength="20"]').first(),
    vpoNumberInput:     m3FormFrame.locator('input[maxlength="17"]'),
    leadFactoryInput:   m3FormFrame.locator('#id_prodWarehouse_header input[role="combobox"]'),
    leadFactoryOption:  m3FormFrame.locator('[role="option"]').first(),
    projectionInput:    m3FormFrame.locator('#id_ProjectionCode_header input'),
    bomInput:           m3FormFrame.locator('#id_bomVersion_header input[role="combobox"]'),
    bomOption:          m3FormFrame.locator('[role="option"]').first(),
    buyTypeInput:       m3FormFrame.locator('#id_buyType_header input[role="combobox"]'),
    buyTypeOption:      m3FormFrame.locator('[role="option"]').first(),
    buyerNameInput:     m3FormFrame.locator('#id_buyName_header input'),
    coNumberInput:      m3FormFrame.locator('#id_coNumber_header input'),

    // ── Actions ───────────────────────────────────────────────────
    createBtn:          m3FormFrame.locator('button#createButton'),
  };
}

module.exports = { buildLocators };
