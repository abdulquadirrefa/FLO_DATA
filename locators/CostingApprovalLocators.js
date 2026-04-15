/**
 * @param {import('@playwright/test').FrameLocator|import('@playwright/test').Locator} m3Frame
 * @param {import('@playwright/test').FrameLocator} m3FormFrame
 * @param {'QA'|'UAT'} env
 */
function buildLocators(m3Frame, m3FormFrame, env) {
  return {
    // ── Navigation ────────────────────────────────────────────────
    startTab:           m3Frame.locator('#startDiv').first(),
    costingApprovalBtn: env === 'QA'
                          ? m3Frame.locator('#MyCanvas span[tag="/mne/apps/costing-approval-sdk/"]').filter({ hasText: 'Costing Approval SDK' })
                          : m3Frame.locator('span[tag="/mne/apps/costing-approval-sdk/"]'),

    // ── Page ready indicator ──────────────────────────────────────
    categoryLabel:      m3FormFrame.locator('label').filter({ hasText: 'Category' }).first(),

    // ── Search fields ─────────────────────────────────────────────
    categoryInput:      m3FormFrame.locator('kendo-combobox').nth(0).locator('input'),
    categoryOption:     m3FormFrame.locator('[role="option"]').first(),

    styleInput:         m3FormFrame.locator('div.custom-grid-button input.k-input'),
    styleSearchBtn:     m3FormFrame.locator('div.custom-grid-button button.grid-select'),

    coFilterInput:      m3FormFrame.locator('div.row:has(label:text-is("CO Filter:")) kendo-combobox input[role="combobox"]').nth(1),
    coFilterOption:     m3FormFrame.locator('[role="option"]').first(),

    // ── Buttons ───────────────────────────────────────────────────
    loadBtn:            m3FormFrame.locator('button').filter({ hasText: /^\s*Load\s*$/ }).first(),
    approveBtn:         m3FormFrame.locator('button:has-text("Approve"):not([disabled]):not(.k-state-disabled)'),

    // ── Table ─────────────────────────────────────────────────────
    firstRowCheckbox:   m3FormFrame.locator('td[role="gridcell"] input[type="checkbox"].k-checkbox').first(),
    gridCell:           m3FormFrame.locator('td[role="gridcell"]'),

    // ── Confirm dialog ────────────────────────────────────────────
    confirmYesBtn:      m3FormFrame.locator('button:has-text("Yes")'),
  };
}

module.exports = { buildLocators };
