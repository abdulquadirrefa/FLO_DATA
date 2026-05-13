/**
 * Locators for the Fabric Inspection flow.
 * @param {import('@playwright/test').Page} page
 */
function buildFabricLocators(page) {
  return {
    // ── Sidebar navigation ─────────────────────────────────────────
    inspectionMenuItem:       page.getByRole('menuitem', { name: /Inspection/i }).first(),
    fabricInspectionListLink: page.getByRole('link', { name: 'Fabric Inspection List' }),

    // ── Search form ────────────────────────────────────────────────
    searchByInvoiceText: page.getByText('Search By Invoice Number', { exact: true }),
    invoiceCombobox:     page.getByRole('combobox').filter({ hasText: /Search By Invoice Number/i }),

    /** @param {string} invoice */
    invoiceOption: (invoice) => page.getByRole('option', { name: invoice, exact: true }),

    searchBtn: page.getByRole('button', { name: /icon:\s*search/i }),

    // ── Results table ──────────────────────────────────────────────
    resultsTableBody: page.locator('tbody').first(),

    /** @param {string} invoice */
    invoiceRowCheckbox: (invoice) =>
      page.getByRole('row').filter({ hasText: invoice }).first().getByLabel('', { exact: true }),

    createBatchBtn: page.getByRole('button', { name: 'Create Inspection Batch' }),

    // ── Batch form — Category & Defect ─────────────────────────────
    categoryCombobox: page.getByRole('row', { name: /Category.*Fabric.*Way/i }).getByRole('combobox').first(),
    defectCombobox:   page.getByRole('row', { name: /GRN Date/i }).getByRole('combobox').first(),

    /** @param {string} text */
    dropdownOption: (text) => page.getByRole('option', { name: text, exact: true }),

    // ── Batch form — spinbutton detail inputs ──────────────────────
    // All four inputs are spinbuttons in DOM order
    spinbutton3: page.getByRole('spinbutton').nth(3),
    spinbutton4: page.getByRole('spinbutton').nth(4),
    spinbutton5: page.getByRole('spinbutton').nth(5),
    spinbutton6: page.getByRole('spinbutton').nth(6),

    // ── Remarks textarea ───────────────────────────────────────────
    remarkTextarea: page.locator('textarea').first(),

    // ── Shade Group section ────────────────────────────────────────
    shadeGroupInput: page
      .getByRole('columnheader', { name: /Shade Group.*Fill/i })
      .getByRole('textbox'),

    // Fill buttons (0 = shade group, 1 = first qty col, 2 = col8, 3 = col9)
    fillBtns: page.getByRole('button', { name: 'Fill' }),

    // First roll quantity input in the shade group table body
    firstRollQtyInput: page
      .locator('.ant-col > .ant-input-number > .ant-input-number-input-wrap > .ant-input-number-input')
      .first(),

    col8HeaderInput: page.locator(
      'th:nth-child(8) .ant-input-number-input'
    ),
    col9HeaderInput: page.locator(
      'th:nth-child(9) .ant-input-number-input'
    ),

    // Currently focused Ant Design number input (used after clicking a cell)
    focusedNumberInput: page.locator(
      '.ant-input-number-focused .ant-input-number-input'
    ),

    // Shade group data row checkbox
    shadeGroupRowCheckbox: page
      .getByRole('row', { name: /Shade Group.*AA.*Fill Ticket/i })
      .getByLabel('', { exact: true }),

    // ── Post-Yes quantity fields ───────────────────────────────────
    col17Input: page.locator('td:nth-child(17) .ant-input-number-input'),
    col18Input: page.locator('td:nth-child(18) .ant-input-number-input'),

    mainContent: page.getByRole('main'),

    // ── Action buttons ─────────────────────────────────────────────
    yesBtn:     page.getByRole('button', { name: 'Yes' }),
    saveBtn:    page.getByRole('button', { name: 'Save' }),
    confirmBtn: page.getByRole('button', { name: 'Confirm' }),
    proceedBtn: page.getByRole('button', { name: 'Proceed' }),

    // ── Success dialog ─────────────────────────────────────────────
    successMsg: page.getByText('Inspection job has been added successfully!'),
    okBtn:      page.getByRole('button', { name: 'OK' }),

    // ── Post-success navigation ────────────────────────────────────
    backArrow:            page.locator('.anticon-arrow-left').first(),
    inspectionPendingTab: page.getByRole('tab', { name: 'Inspection Pending' }),
  };
}

module.exports = { buildFabricLocators };