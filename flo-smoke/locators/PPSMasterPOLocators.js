// ─────────────────────────────────────────────────────────────────────────────
// PPSMasterPOLocators.js
// Selectors for the PPS › Master PO Planning page.
//
// Page structure observed in the screenshot:
//   ┌─ Plant selector dropdown (top bar) ──────────────────────────────────┐
//   │  * Select Plant:  [B03-BLI-Wathupitiwala ▾]                          │
//   └──────────────────────────────────────────────────────────────────────┘
//   ┌─ Step-breadcrumb (19 steps) ─────────────────────────────────────────┐
//   │  1 Master PO Selection  2 Operation Routing  3 Job Preference …      │
//   └──────────────────────────────────────────────────────────────────────┘
//   ┌─ Master Production Order Details form ───────────────────────────────┐
//   │  * Select Style   │ Select Schedule │ Select Color │ Select Mo Type  │
//   │  Select Structure Type                                               │
//   │                          [ Search ]                                  │
//   └──────────────────────────────────────────────────────────────────────┘
//   ┌─ Results table ──────────────────────────────────────────────────────┐
//   │  Master PO Type │ Master PO Number │ Style │ … │ Action [Delete][Proceed]│
//   └──────────────────────────────────────────────────────────────────────┘
//
// Assumptions:
//   - Dropdown fields use ng-select, mat-select, or a plain <select> with
//     placeholder text.  Text-based fallbacks provided for all.
//   - The stepper items are rendered as numbered circles (likely <span> or
//     <div> with the step number followed by the step name).
// ─────────────────────────────────────────────────────────────────────────────

function buildPPSMasterPOLocators(page) {
  return {
    // ── Page header / title ───────────────────────────────────────────────
    pageHeading: page.locator(
      'h1, h2, h3, [class*="page-title"], [class*="heading"]'
    ).filter({ hasText: /Master.*PO.*Planning|Master Production Order/i }).first(),

    // ── Plant selector (top of page) ──────────────────────────────────────
    plantSelectorDropdown: page.locator(
      'ng-select[placeholder*="Plant" i], mat-select[placeholder*="Plant" i], ' +
      'select[id*="plant" i], [class*="plant"] ng-select, ' +
      '[placeholder*="Select Plant" i]'
    ).first(),

    plantSelectorTrigger: page.locator(
      // Angular Material or ng-select trigger wrappers
      '[class*="plant"] .ng-select-container, [class*="plant"] .mat-select-trigger, ' +
      '[class*="plant-select"], [aria-label*="plant" i]'
    ).first(),

    // ── Step breadcrumb (19 steps) ────────────────────────────────────────
    stepperContainer: page.locator(
      '[class*="stepper"], [class*="steps"], [class*="breadcrumb"], ol, ul'
    ).filter({ hasText: /Master PO Selection/i }).first(),

    // Individual step items – get by step number or name
    stepByNumber: (n) =>
      page.locator(`[class*="step"]`).filter({ hasText: new RegExp(`^${n}\\b`) }).first(),

    stepByName: (name) =>
      page.locator('[class*="step"], li, span').filter({ hasText: new RegExp(name, 'i') }).first(),

    step1MasterPOSelection:  page.locator('[class*="step"], li, span, div').filter({ hasText: /Master PO Selection/i }).first(),
    step2OperationRouting:   page.locator('[class*="step"], li, span, div').filter({ hasText: /Operation Routing/i }).first(),
    step3JobPreference:      page.locator('[class*="step"], li, span, div').filter({ hasText: /Job Preference/i }).first(),

    // ── "Master Production Order Details" section heading ─────────────────
    sectionHeading: page.locator(
      'h2, h3, h4, [class*="section"], [class*="card-title"]'
    ).filter({ hasText: /Master Production Order Details/i }).first(),

    // ── Search form fields ────────────────────────────────────────────────
    styleDropdown: page.locator(
      'ng-select[placeholder*="Style" i], mat-select[placeholder*="Style" i], ' +
      'select[id*="style" i], [placeholder*="Select Style" i]'
    ).first(),

    scheduleDropdown: page.locator(
      'ng-select[placeholder*="Schedule" i], mat-select[placeholder*="Schedule" i], ' +
      '[placeholder*="Select Schedule" i]'
    ).first(),

    colorDropdown: page.locator(
      'ng-select[placeholder*="Color" i], mat-select[placeholder*="Color" i], ' +
      '[placeholder*="Select Color" i]'
    ).first(),

    moTypeDropdown: page.locator(
      'ng-select[placeholder*="Mo Type" i], mat-select[placeholder*="Mo Type" i], ' +
      '[placeholder*="Select Mo Type" i]'
    ).first(),

    structureTypeDropdown: page.locator(
      'ng-select[placeholder*="Structure" i], mat-select[placeholder*="Structure" i], ' +
      '[placeholder*="Select Structure Type" i]'
    ).first(),

    searchButton: page.locator(
      'button:has-text("Search"), input[value="Search"], [class*="search-btn"]'
    ).first(),

    // ── Results table ─────────────────────────────────────────────────────
    resultsTable: page.locator('table, [class*="grid"], [class*="table"]').first(),

    tableHeaders: page.locator('table thead th, [class*="header-cell"]'),

    tableRows: page.locator('table tbody tr, [class*="row"]:not([class*="header"])'),

    // Action buttons inside the first data row
    deleteButton:  page.locator('button:has-text("Delete")').first(),
    proceedButton: page.locator('button:has-text("Proceed")').first(),

    // ── Loading / spinner indicator ───────────────────────────────────────
    loadingSpinner: page.locator(
      '[class*="spinner"], [class*="loading"], mat-progress-spinner, ' +
      '[class*="loader"]'
    ).first(),

    // ── Error / empty state message ───────────────────────────────────────
    noDataMessage: page.locator(
      '[class*="no-data"], [class*="empty"], td[colspan]'
    ).first(),
  };
}

module.exports = { buildPPSMasterPOLocators };
