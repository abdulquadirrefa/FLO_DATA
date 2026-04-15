// ─────────────────────────────────────────────────────────────────────────────
// PPSMasterPOPage.js  –  POM for PPS › Master PO Planning
// ─────────────────────────────────────────────────────────────────────────────

const { buildPPSMasterPOLocators } = require('../locators/PPSMasterPOLocators');

class PPSMasterPOPage {
  constructor(page) {
    this.page = page;
    Object.assign(this, buildPPSMasterPOLocators(page));
  }

  // ── Wait for the page to fully load ───────────────────────────────────────
  async waitForPageReady() {
    console.log('[PPSMasterPO] Waiting for page to be ready…');
    await this.page.waitForLoadState('networkidle', { timeout: 60000 });

    // Wait for spinner to disappear (if present)
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 20000 });
    } catch {
      // Spinner may not exist – that's fine
    }
    console.log('[PPSMasterPO] Page ready.');
  }

  // ── Verify key UI elements are present ────────────────────────────────────
  async verifyPageElements() {
    const results = {};

    const checks = [
      { key: 'plantSelector',      locator: this.plantSelectorDropdown.or(this.plantSelectorTrigger) },
      { key: 'stepperContainer',   locator: this.stepperContainer },
      { key: 'step1',              locator: this.step1MasterPOSelection },
      { key: 'sectionHeading',     locator: this.sectionHeading },
      { key: 'styleDropdown',      locator: this.styleDropdown },
      { key: 'scheduleDropdown',   locator: this.scheduleDropdown },
      { key: 'colorDropdown',      locator: this.colorDropdown },
      { key: 'moTypeDropdown',     locator: this.moTypeDropdown },
      { key: 'structureDropdown',  locator: this.structureTypeDropdown },
      { key: 'searchButton',       locator: this.searchButton },
    ];

    for (const { key, locator } of checks) {
      const visible = await locator.isVisible().catch(() => false);
      results[key] = visible;
      console.log(`[PPSMasterPO] Element "${key}": ${visible ? '✓ visible' : '✗ NOT visible'}`);
    }

    return results;
  }

  // ── Verify the 19-step stepper has the expected labels ────────────────────
  async verifyStepperSteps() {
    const expectedSteps = [
      'Master PO Selection',
      'Operation Routing',
      'Job Preference',
      'Fabric Properties',
      'Component Group Assignment',
      'Replacement Group',
      'Add Additional Qty',
      'Sub PO Creation',
      'Sub PO Ratio',
      'Sub PO Marker Versions',
      'Markers Summary',
      'Packing List',
      'Generate Dockets',
      'Generate Lay Job',
      'Docket View',
      'Layplan View',
      'Sewing Jobs generation',
      'View Sewing Jobs',
      'View Embellishment Jobs',
    ];

    const results = {};
    for (const stepName of expectedSteps) {
      const visible = await this.stepByName(stepName).isVisible().catch(() => false);
      results[stepName] = visible;
      console.log(`[PPSMasterPO] Step "${stepName}": ${visible ? '✓' : '✗'}`);
    }
    return results;
  }

  // ── Verify table column headers ───────────────────────────────────────────
  async verifyTableHeaders() {
    const expectedHeaders = [
      'Master PO Type',
      'Master PO Number',
      'Style',
      'Schedule',
      'Color',
      'MO Type',
      'Master PO Description',
      'Total PO Qty',
      'Action',
    ];

    const results = {};
    for (const header of expectedHeaders) {
      const el = this.page.locator('th, [class*="header-cell"]').filter({ hasText: new RegExp(header, 'i') });
      const visible = await el.isVisible().catch(() => false);
      results[header] = visible;
      console.log(`[PPSMasterPO] Table header "${header}": ${visible ? '✓' : '✗'}`);
    }
    return results;
  }

  // ── Click Search with empty filters (loads all available MOs) ────────────
  async clickSearch() {
    console.log('[PPSMasterPO] Clicking Search button…');
    await this.searchButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.searchButton.click();
    await this.waitForPageReady();
    console.log('[PPSMasterPO] Search complete.');
  }

  // ── Count visible data rows ───────────────────────────────────────────────
  async getRowCount() {
    await this.page.waitForTimeout(1000); // let table render
    const count = await this.tableRows.count();
    console.log(`[PPSMasterPO] Table row count: ${count}`);
    return count;
  }

  // ── Check that first-row action buttons are present ───────────────────────
  async verifyActionButtons() {
    const deleteVisible  = await this.deleteButton.isVisible().catch(() => false);
    const proceedVisible = await this.proceedButton.isVisible().catch(() => false);
    console.log(`[PPSMasterPO] Delete button: ${deleteVisible ? '✓' : '✗'}`);
    console.log(`[PPSMasterPO] Proceed button: ${proceedVisible ? '✓' : '✗'}`);
    return { deleteVisible, proceedVisible };
  }

}

module.exports = { PPSMasterPOPage };
