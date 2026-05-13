/**
 * Locators for the Trims Inspection – Search By Invoice Number flow.
 * @param {import('@playwright/test').Page} page
 */
function buildTrimsLocators(page) {
  return {
    // ── Sidebar navigation ────────────────────────────────────────
    inspectionMenuItem:      page.getByRole('menuitem', { name: /Inspection/i }).first(),
    trimsInspectionListLink: page.getByText('Trims Inspection List', { exact: true }),

    // ── Search form ───────────────────────────────────────────────
    // Click this to open the dropdown — the search input appears after click
    invoiceCombobox: page.getByRole('combobox').filter({ hasText: /Search By Invoice Number/i }),
    clearBtn: page.locator('.ant-select-clear'),

    /** @param {string} invoice */
    invoiceOption: (invoice) => page.getByRole('option', { name: invoice, exact: true }),

    searchBtn: page.getByRole('button', { name: /icon:\s*search/i }),

    // ── Results table ─────────────────────────────────────────────
    resultsTableBody: page.locator('tbody').first(),

    /** Checkbox on the row that contains the invoice number */
    invoiceRowCheckbox: (invoice) =>
      page
        .getByRole('row')
        .filter({ hasText: invoice })
        .first()
        .getByLabel('', { exact: true }),

    createBatchBtn: page.getByRole('button', { name: 'Create Inspection Batch' }),

    // ── Batch detail table ────────────────────────────────────────
    mainContent: page.getByRole('main'),

    // Checkbox on the first data row (col 0)
    dataRowCheckbox: page
      .getByRole('rowgroup').nth(1)
      .getByRole('row').first()
      .getByRole('checkbox').first(),

    // "Approved" checkbox in the column header — triggers the Yes/No dialog
    approvedHeaderCheckbox: page
      .getByRole('columnheader', { name: /^Approved$/i })
      .locator('input.ant-checkbox-input'),

    yesBtn:    page.getByRole('button', { name: 'Yes' }),
    updateBtn: page.getByRole('button', { name: 'Update' }),

    // ── Success dialog ────────────────────────────────────────────
    successMsg: page.getByText('Inspection job has been added successfully!'),
    okBtn:      page.getByRole('button', { name: 'OK' }),
  };
}

module.exports = { buildTrimsLocators };