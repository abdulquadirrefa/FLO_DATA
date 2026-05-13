const { buildFabricLocators }    = require('../../locators/flo/FabricInspectionLocators');
const { fabricInspectionData }   = require('../../config/flo/fabricInspectionData');

class FabricInspectionPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildFabricLocators(page));
  }

  // ── 1. Navigate: Inspection → Fabric Inspection List ─────────────
  async navigateToFabricInspection() {
    await this.inspectionMenuItem.waitFor({ state: 'visible', timeout: 15000 });
    await this.inspectionMenuItem.click();
    await this.page.waitForTimeout(500);

    await this.fabricInspectionListLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.fabricInspectionListLink.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Navigated to Fabric Inspection List');
  }

  // ── 2. Select "Search By Invoice Number" search type ─────────────
  async selectSearchType() {
    const isVisible = await this.searchByInvoiceText.isVisible().catch(() => false);
    if (isVisible) {
      await this.searchByInvoiceText.click();
      await this.page.waitForTimeout(300);
      console.log('  → Search type set to: Invoice Number');
    }
  }

  // ── 3. Search for an invoice ──────────────────────────────────────
  /** @param {string} invoice */
  async searchInvoice(invoice) {
    await this.invoiceCombobox.waitFor({ state: 'visible', timeout: 15000 });
    await this.invoiceCombobox.click();
    await this.page.waitForTimeout(400);

    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.type(invoice);
    await this.page.waitForTimeout(800);

    const option = this.invoiceOption(invoice);
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();

    await this.searchBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.searchBtn.click();
    await this.page.waitForTimeout(1500);
    console.log(`  → Searched for invoice: ${invoice}`);
  }

  // ── 4. Verify invoice in results table ────────────────────────────
  /** @param {string} invoice */
  async verifyInvoiceInTable(invoice) {
    await this.resultsTableBody.waitFor({ state: 'visible', timeout: 15000 });
    const text = await this.resultsTableBody.textContent();
    if (!text?.includes(invoice)) throw new Error(`Invoice ${invoice} not found in table`);
    console.log(`  ✅ Invoice ${invoice} found in table`);
  }

  // ── 5. Select invoice row checkbox ───────────────────────────────
  /** @param {string} invoice */
  async selectInvoiceRow(invoice) {
    const cb = this.invoiceRowCheckbox(invoice);
    await cb.waitFor({ state: 'visible', timeout: 10000 });
    await cb.check();
    await this.page.waitForTimeout(500);
    console.log(`  → Invoice row selected: ${invoice}`);
  }

  // ── 6. Create Inspection Batch ────────────────────────────────────
  async clickCreateInspectionBatch() {
    await this.createBatchBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.createBatchBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Create Inspection Batch');
  }

  // ── 7. Fill Category (One Way) and Defect (Bowing) ───────────────
  async fillCategoryAndDefect() {
    // Category combobox → One Way
    await this.categoryCombobox.waitFor({ state: 'visible', timeout: 15000 });
    await this.categoryCombobox.click();
    const catOption = this.dropdownOption(fabricInspectionData.category);
    await catOption.waitFor({ state: 'visible', timeout: 10000 });
    await catOption.click();
    await this.page.waitForTimeout(500);
    console.log(`  → Category set to: ${fabricInspectionData.category}`);

    // Defect combobox → Bowing
    await this.defectCombobox.waitFor({ state: 'visible', timeout: 10000 });
    await this.defectCombobox.click();
    const defOption = this.dropdownOption(fabricInspectionData.defect);
    await defOption.waitFor({ state: 'visible', timeout: 10000 });
    await defOption.click();
    await this.page.waitForTimeout(500);
    console.log(`  → Defect set to: ${fabricInspectionData.defect}`);
  }

  // ── 8. Fill spinbutton detail inputs (all four are spinbuttons in DOM order)
  async fillDetailInputs() {
    const v = fabricInspectionData.detailValue;

    for (const sb of [this.spinbutton3, this.spinbutton4, this.spinbutton5, this.spinbutton6]) {
      await sb.waitFor({ state: 'visible', timeout: 10000 });
      await sb.click();
      await sb.fill(v);
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(200);
    }

    console.log('  → Detail inputs filled');
  }

  // ── 9. Fill remarks textarea ──────────────────────────────────────
  async fillRemark() {
    await this.remarkTextarea.waitFor({ state: 'visible', timeout: 10000 });
    await this.remarkTextarea.click();
    await this.remarkTextarea.fill(fabricInspectionData.remark);
    await this.page.waitForTimeout(300);
    console.log(`  → Remark filled: ${fabricInspectionData.remark}`);
  }

  // ── 10. Fill Shade Group + all Fill columns ───────────────────────
  async fillShadeGroup() {
    const v = fabricInspectionData.fillValue;
    const sg = fabricInspectionData.shadeGroup;

    // Shade group code → Fill
    await this.shadeGroupInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.shadeGroupInput.click();
    await this.shadeGroupInput.fill(sg);
    await this.fillBtns.first().click();
    await this.page.waitForTimeout(500);
    console.log(`  → Shade group "${sg}" filled`);

    // First roll qty column → Fill
    await this.firstRollQtyInput.click();
    await this.focusedNumberInput.fill(v);
    await this.fillBtns.nth(1).click();
    await this.page.waitForTimeout(500);

    // Col 8 header input → Fill
    await this.col8HeaderInput.click();
    await this.focusedNumberInput.fill(v);
    await this.fillBtns.nth(2).click();
    await this.page.waitForTimeout(500);

    // Col 9 header input → Fill
    await this.col9HeaderInput.click();
    await this.focusedNumberInput.fill(v);
    await this.fillBtns.nth(3).click();
    await this.page.waitForTimeout(500);

    console.log('  → All shade group quantities filled');
  }

  // ── 11. Select shade group row → triggers the Yes/No dialog ──────
  async selectShadeGroupRow() {
    await this.shadeGroupRowCheckbox.waitFor({ state: 'visible', timeout: 15000 });
    await this.shadeGroupRowCheckbox.click();
    await this.page.waitForTimeout(500);
    console.log('  → Shade group row selected');
  }

  // ── 12. Click Yes on "All pending quantities" dialog ─────────────
  async clickYes() {
    await this.yesBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.yesBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Yes');
  }

  // ── 13. Fill final quantity fields (col 17 & 18) ──────────────────
  async fillFinalQuantities() {
    const v = fabricInspectionData.finalQuantity;

    await this.col17Input.waitFor({ state: 'visible', timeout: 15000 });
    await this.col17Input.click();
    await this.focusedNumberInput.fill(v);
    await this.page.keyboard.press('Tab');

    await this.col18Input.click();
    await this.focusedNumberInput.fill(v);
    await this.page.keyboard.press('Tab');

    // Click main content to defocus
    await this.mainContent.click();
    await this.page.waitForTimeout(500);
    console.log('  → Final quantities filled');
  }

  // ── 14. Save ──────────────────────────────────────────────────────
  async clickSave() {
    await this.saveBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.saveBtn.click();
    await this.page.waitForTimeout(1500);
    console.log('  → Clicked Save');
  }

  // ── 15. Confirm ───────────────────────────────────────────────────
  async clickConfirm() {
    await this.confirmBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.confirmBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Confirm');
  }

  // ── 16. Proceed on "Are you sure?" dialog ────────────────────────
  async clickProceed() {
    await this.proceedBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.proceedBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Proceed');
  }

  // ── 17. Verify success message ────────────────────────────────────
  async verifySuccess() {
    await this.successMsg.waitFor({ state: 'visible', timeout: 20000 });
    console.log('  ✅ Success: Inspection job added');
  }

  // ── 18. Click OK ──────────────────────────────────────────────────
  async clickOK() {
    await this.okBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.okBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked OK');
  }

  // ── 19. Click back arrow ──────────────────────────────────────────
  async clickBack() {
    await this.backArrow.waitFor({ state: 'visible', timeout: 10000 });
    await this.backArrow.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Back');
  }
}

module.exports = { FabricInspectionPage };
