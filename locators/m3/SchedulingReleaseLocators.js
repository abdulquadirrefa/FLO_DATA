/**
 * @param {import('@playwright/test').FrameLocator|import('@playwright/test').Locator} m3Frame
 * @param {import('@playwright/test').FrameLocator} m3FormFrame
 * @param {'QA'|'UAT'} env
 */
function buildLocators(m3Frame, m3FormFrame, env) {
  return {
    // ── Navigation ────────────────────────────────────────────────
    startTab:              m3Frame.locator('#startDiv').first(),
    schedulingReleaseBtn:  env === 'QA'
                             ? m3Frame.locator('#MyCanvas span[tag="/mne/apps/schedule-release-sdk/"]').filter({ hasText: 'Scheduling and Release SDK' })
                             : m3Frame.locator('span[tag="/mne/apps/schedule-release-sdk/"]'),

    // ── Page ready indicator ──────────────────────────────────────
    facilityLabel:         m3FormFrame.locator('label.mandatory').filter({ hasText: 'Facility' }).first(),

    // ── Search fields ─────────────────────────────────────────────
    facilityInput:         m3FormFrame.locator('input[placeholder="--Select--"]').first(),
    facilityOption:        m3FormFrame.locator('[role="option"]').first(),

    styleInput:            m3FormFrame.locator('input[placeholder*="first six"]'),
    styleOption:           m3FormFrame.locator('[role="option"]').first(),

    coNumberInput:         m3FormFrame.locator('input[placeholder*="first eight"]'),
    coNumberOption:        m3FormFrame.locator('[role="option"]').first(),

    // ── Buttons ───────────────────────────────────────────────────
    scheduleSearchBtn:     m3FormFrame.locator('button.k-button-icon.k-button[icon="search"]').first(),
    retrieveBtn:           m3FormFrame.locator('button:has-text("Retrieve")'),
    addScheduleBtn:        m3FormFrame.locator('button:has-text("Add Schedule")'),
    addScheduleEnabled:    m3FormFrame.locator('button:has-text("Add Schedule"):not([disabled])'),
    releaseScheduleBtn:    m3FormFrame.locator('button:has-text("Release Schedule")'),
    releaseScheduleEnabled: m3FormFrame.locator('button:has-text("Release Schedule"):not([disabled])'),

    // ── Schedule dialog ───────────────────────────────────────────
    scheduleDialogRow:     m3FormFrame.locator('td[role="gridcell"][aria-colindex="1"]').first(),
    scheduleDialogSelect:  m3FormFrame.locator('button:has-text("Select")'),

    // ── Main table ────────────────────────────────────────────────
    mainTableFirstRow:     m3FormFrame.locator('tr[data-kendo-grid-item-index="0"]'),
    tableRows:             m3FormFrame.locator('tr[data-kendo-grid-item-index]'),

    // ── Confirm dialog ────────────────────────────────────────────
    confirmBtn:            m3FormFrame.locator('button:has-text("OK"), button:has-text("Ok"), button:has-text("Okay")').first(),

    // ── Grid options ──────────────────────────────────────────────
    gridOption:            m3FormFrame.locator('[role="option"]'),
    gridCell:              m3FormFrame.locator('td[role="gridcell"]'),
  };
}

module.exports = { buildLocators };
