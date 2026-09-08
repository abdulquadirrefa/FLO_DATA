// ─────────────────────────────────────────────────────────────────────────────
// WMSLocators.js
// Locators for the WMS (Warehouse Management System) module.
//
// WMS lives inside the FLO app (same sidebar/session as PPS, MDM, etc.), so
// no separate login is required — the regression "setup" project's stored
// session already covers it.
// ─────────────────────────────────────────────────────────────────────────────

function buildWMSLocators(page) {
  return {
    // ── Sidebar navigation: WMS → Warehouse Requests → Production Requests ──
    wmsNavItem: page.getByRole('menuitem', { name: /^WMS$/i })
      .or(page.locator('a, li, span').filter({ hasText: /^WMS$/ }).first()),

    warehouseRequestsMenuItem: page.getByText('Warehouse Requests', { exact: true }),

    productionRequestsLink: page.getByText('Production Requests', { exact: true }),

    // ── Production Requests page ────────────────────────────────────────────
    requestCategoryLabel: page.locator('label').filter({ hasText: 'Request Category' }),

    // Ant Design dropdown for Request Category — opens a list of options
    requestCategoryDropdown: page.locator('.ant-form-item')
    .filter({ hasText: 'Request Category' })
    .locator('.ant-select-selection'),

    /** @param {string} option e.g. "Sewing" */
    requestCategoryOption: (option) => page.getByRole('option', { name: option, exact: true }),

    // Ant Design dropdown / combobox for Schedule
    scheduleDropdown: page.locator('.ant-select').filter({ hasText: /Schedule/i }).first(),

    /** @param {string} schedule */
    scheduleOption: (schedule) => page.getByRole('option', { name: schedule, exact: true }),

    // Search button — circular icon-only button
    searchBtn: page.locator('button.ant-btn-circle-outline.ant-btn-icon-only'),

    // ── Results table ────────────────────────────────────────────────────────
    resultsTableBody: page.locator('tbody').first(),

    /** Row containing the given schedule number */
    scheduleRow: (schedule) => page.getByRole('row').filter({ hasText: schedule }).first(),

    /** Status cell text within the row for the given schedule number */
    statusCellInRow: (schedule) =>
      page.getByRole('row').filter({ hasText: schedule })
        .locator('td').filter({ hasText: /Requested|Allocated|Completed/i }).first(),

    // Selection column dropdown within the row for the given schedule number
 selectionDropdownInRow: (schedule) =>
  page.locator('.ant-table-fixed-right .ant-table-body-inner')
      .getByRole('combobox'),

selectionActionOption: (action) =>
  page.locator('.ant-select-dropdown:visible')
      .locator('li', { hasText: action }).first(),

proceedBtnInRow: (schedule) =>
  page.locator('.ant-table-fixed-right .ant-table-body-inner')
      .getByRole('button', { name: 'Proceed' }),

    // ── Allocation page (after clicking Proceed) ─────────────────────────────
    allocationMethodHeading: page.getByText('Allocation Method', { exact: true }),

    allocationTableBody: page.locator('tbody').first(),

    allocationTableRows: page.locator('tbody').first().getByRole('row'),

    /** Checkbox in the allocation table row at the given index (0-based) */
    allocationRowCheckbox: (index) =>
      page.locator('tbody').first().getByRole('row').nth(index)
        .locator('input.ant-checkbox-input, input[type="checkbox"]').first(),

    manualBtn: page.getByRole('button', { name: 'Manual', exact: true }),
    autoBtn:   page.getByRole('button', { name: 'Auto', exact: true }),

    // ── Manual Allocate Trims page (after clicking Manual) ───────────────────
    manualAllocateTrimsHeading: page.getByText('Manual Allocate Trims', { exact: true }),

    // down-square icon button that triggers the detail table to load
    downSquareBtn: page.locator('button.ant-btn.ant-btn-icon-only').filter({ has: page.locator('.anticon-down-square') }),

    // Scrollable table container on Manual Allocate Trims
    manualAllocateTableContainer: page.locator('div.ant-table-body'),

    // All level-0 parent item-rows (one per Item Code in the table)
    manualItemRows: page.locator('tr.ant-table-row-level-0'),

    // Confirm button on the Manual Allocate Trims page
    confirmBtn: page.getByRole('button', { name: 'Confirm', exact: true }),

    // OK inside the confirmation popup dialog
    confirmDialogOkBtn: page.locator('.ant-modal-confirm .ant-btn-primary')
      .or(page.locator('.ant-modal').getByRole('button', { name: 'OK' }))
      .or(page.getByRole('button', { name: 'OK' })),

    // Alternate warning dialog shown when the allocated amount doesn't cover
    // the full balance — has its own "Yes" button to proceed anyway.
    materialsNotAllocatedText: page.getByText(/Materials has not been allocated/i),
    modalYesBtn: page.locator('.ant-modal').getByRole('button', { name: 'Yes', exact: true }),
  };
}

module.exports = { buildWMSLocators };
