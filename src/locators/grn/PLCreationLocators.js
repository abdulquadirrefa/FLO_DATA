/** @param {import('@playwright/test').Page} page */
function buildLocators(page) {
  const drawer = page.locator('.ant-drawer-content').first();

  return {
    navLink:              page.locator('a[href="/raw-material/delivery/pl-upload"]:has-text("PL Creation")').first(),
    poInput:              page.locator('#poNo, input[placeholder="Enter Valid PO number to create a PL"]').first(),
    nextBtn:              page.locator('button:has-text("Next")').first(),
    createPackingListBtn: page.locator('button.ant-btn-primary:has-text("Create Packing List")').first(),
    packingListNoInput:   page.locator('input[placeholder="Packing List No"]').first(),
    invoiceNoInput:       page.locator('input[placeholder="Invoice No"]').first(),
    cusdecNoInput:        page.locator('input[placeholder="Cusdec Number"]').first(),
    autoPopulateBtn:      page.locator('button.ant-btn-primary:has-text("Auto Populate Order Quantity")').first(),
    confirmYesBtn:        page.locator(
                            '.ant-popover-buttons button:has-text("Yes"), ' +
                            '.ant-popconfirm-buttons button:has-text("Yes"), ' +
                            'button.ant-btn-primary:has-text("Yes")'
                          ).first(),
    drawer,
    saveBtn:              page.locator('button:has-text("Save"):not(:has-text("Save Changes"))').first(),
    saveChangesBtn:       page.locator('button:has-text("Save Changes")').first(),
    submitBtn:            page.locator('button:has-text("Submit")').first(),
    successMessage:       page.locator('.ant-result-title:has-text("File uploaded Successfully")').first(),
    uploadAnotherBtn:     page.locator('button:has-text("Upload Another Packing List")').first(),

    // ── Packing List Details spreadsheet (line split flow) ──
    spreadsheetHeaders:   drawer.locator('.Spreadsheet__table tbody tr:first-child > th'),  // corner + column headers
    spreadsheetRows:      drawer.locator('.Spreadsheet__table tbody tr[row]'),
    cellEditor:           drawer.locator('.Spreadsheet__active-cell--edit').first(),
    rowSelectionLabel:    drawer.locator('.ant-card-extra p').filter({ hasText: /selected/i }).first(), // "Row is not Selected" / "Selected Row : 2"
    copyCountInput:       drawer.locator('input.ant-input-number-input[aria-valuemax="1000"]').first(),
    copyRowBtn:           drawer.locator('button:has(i[aria-label="icon: copy"])').first(),
    deleteRowBtn:         drawer.locator('button:has-text("Delete")').first(),
    subTotalInput:        drawer.locator('xpath=.//*[normalize-space(text())="Sub Total"]/following::input[1]'),
    balanceWOTInput:      drawer.locator('xpath=.//*[normalize-space(text())="Balance to Receive Quantity(W.O.T)"]/following::input[1]'),
    balanceWTInput:       drawer.locator('xpath=.//*[normalize-space(text())="Balance to Receive Quantity(W.T)"]/following::input[1]'),
  };
}

module.exports = { buildLocators };
