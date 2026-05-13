/**
 * @param {import('@playwright/test').FrameLocator} m3FormFrame
 */
function buildLocators(m3FormFrame) {
  return {
    // ── Line Entry fields ─────────────────────────────────────────
    zFeatureInput:       m3FormFrame.locator('#id_zFeature_lineEntrySingle input[role="combobox"]'),
    zFeatureOption:      m3FormFrame.locator('[role="option"]').first(),
    zFeatureSection:     m3FormFrame.locator('#id_zFeature_lineEntrySingle'),

    dateCodeInput:       m3FormFrame.locator('#id_dateCode_lineEntrySingle input'),

    destinationInput:    m3FormFrame.locator('#id_destination_lineEntrySingle input[role="combobox"]'),
    destinationOption:   m3FormFrame.locator('[role="option"]').first(),

    salesChannelInput:   m3FormFrame.locator('#id_salesChLine_lineEntrySingle input[role="combobox"]'),
    salesChannelOption:  m3FormFrame.locator('[role="option"]').first(),

    otherZInput:         m3FormFrame.locator('#id_otherz_lineEntrySingle input'),

    packMethodInput:     m3FormFrame.locator('#id_packMethod_lineEntrySingle input[role="combobox"]'),
    packMethodOption:    m3FormFrame.locator('[role="option"]').first(),

    addLinesBtn:         m3FormFrame.locator('button#addButton'),
    addLinesEnabled:     m3FormFrame.locator('button#submitButton:not([disabled])'),
    releaseForCostingBtn: m3FormFrame.locator('button#submitButton'),

    confirmBtn:          m3FormFrame.locator('button:has-text("OK"), button:has-text("Yes")').first(),
    confirmBtnAlt:       m3FormFrame.locator('button:has-text("Okay"), button:has-text("Yes")').first(),

    // Color row grid cell
    colorGridCell:       m3FormFrame.locator('td[role="gridcell"][aria-colindex="1"]'),
    gridOption:          m3FormFrame.locator('[role="option"]'),
  };
}

module.exports = { buildLocators };
