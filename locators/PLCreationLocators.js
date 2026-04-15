function buildLocators(page) {
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
    drawer:               page.locator('.ant-drawer-content').first(),
    saveBtn:              page.locator('button:has-text("Save"):not(:has-text("Save Changes"))').first(),
    saveChangesBtn:       page.locator('button:has-text("Save Changes")').first(),
    submitBtn:            page.locator('button:has-text("Submit")').first(),
    successMessage:       page.locator('.ant-result-title:has-text("File uploaded Successfully")').first(),
    uploadAnotherBtn:     page.locator('button:has-text("Upload Another Packing List")').first(),
  };
}

module.exports = { buildLocators };
