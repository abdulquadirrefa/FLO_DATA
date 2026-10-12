require('dotenv').config();
const path                                          = require('path');
const { test, expect }                              = require('@playwright/test');
const { GRNLoginPage }                              = require('../../src/pages/grn/GRNLoginPage');
const { WarehouseSelectionPage }                    = require('../../src/pages/grn/WarehouseSelectionPage');
const { PLCreationPage }                            = require('../../src/pages/grn/PLCreationPage');
const { PLOverviewPage }                            = require('../../src/pages/grn/PLOverviewPage');
const { InventoryViewPage }                         = require('../../src/pages/grn/InventoryViewPage');
const { DeviceLoginPage }                           = require('../../src/pages/device/DeviceLoginPage');
const { DeviceScanPage }                            = require('../../src/pages/device/DeviceScanPage');
const { ConfirmGRNPage }                            = require('../../src/pages/grn/ConfirmGRNPage');
const { readPONumbers }                             = require('../../src/utils/excelReader');
const { addResult, printSummary, getCollectedData } = require('../../src/utils/grnResultsTracker');
const { deviceData }                                = require('../../config/grn/deviceData');
const { orderData }                                 = require('../../config/m3/orderData');
const { plSplitData }                               = require('../../config/grn/plSplitData');
const { LocationUpdateApi }                         = require('../../src/api/grn/locationUpdateApi');
const { launchMobileDevice }                        = require('../../src/utils/mobileDevice');
const { DOWNLOADS_DIR }                             = require('../../src/utils/paths');
const { URLS }                                      = require('../../config/urls');

const env          = orderData.env;
const APP_URL      = URLS[env].GRN;
const GRN_USERNAME = process.env.GRN_USERNAME;
const GRN_PASSWORD = process.env.GRN_PASSWORD;
const DEV_USERNAME = process.env.DEVICE_USERNAME;
const DEV_PASSWORD = process.env.DEVICE_PASSWORD;

/** @type {Record<string, import('../../src/pages/grn/PLCreationPage').SplitItem[]>} PO → split items */
const splitResults = {};

// ── Phase 1: Create Packing List with split lines for one PO ─────
/**
 * @param {import('@playwright/test').Page} page
 * @param {string} poNumber
 * @param {boolean} isFirst
 */
async function runPLCreationWithSplit(page, poNumber, isFirst) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  CREATING SPLIT PL FOR PO: ${poNumber}`);
  console.log(`${'═'.repeat(50)}\n`);

  const plCreation = new PLCreationPage(page);

  if (isFirst) {
    await plCreation.navigateToPLCreation();
  }

  await plCreation.enterPONumber(poNumber);
  await plCreation.clickNext();
  await plCreation.clickCreatePackingList();
  await plCreation.fillPackingListForm(poNumber);

  await plCreation.clickAutoPopulateOrderQuantity();
  await plCreation.confirmAlertYes();
  await page.waitForTimeout(2000);

  // Split each item line → copy, remove extras, divide qty, unique BN/SP
  splitResults[poNumber] = await plCreation.splitAllItemLines(plSplitData);

  await plCreation.clickSave();
  await plCreation.clickSaveChanges();
  await plCreation.clickSubmit();
  await plCreation.waitForSuccessMessage(plSplitData.saveSubmitTimeout);

  console.log(`\n✅ Split PL created successfully for PO: ${poNumber}`);
}

// ── Phase 2: Mark one PO as In-House ─────────────────────────────
/**
 * @param {import('@playwright/test').Page} page
 * @param {string} poNumber
 */
async function runMarkAsInHouse(page, poNumber) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  MARKING IN-HOUSE FOR PO: ${poNumber}`);
  console.log(`${'═'.repeat(50)}\n`);

  const plOverview = new PLOverviewPage(page);
  await plOverview.clickEyeIconForPO(poNumber);

  if (plSplitData.consolidatedBarcode) {
    await plOverview.selectAllLinesAllPages();
    await plOverview.printConsolidatedBarcode({
      timeout:    plSplitData.printTimeout,
      saveDir:    path.join(DOWNLOADS_DIR, 'consolidated-barcodes'),
      filePrefix: poNumber,
    });
  }

  await plOverview.clickMarkAsInHouse();
  await plOverview.confirmAlertYes();
  await plOverview.selectAutoGenerateEntryNo();
  await plOverview.waitForMarkAsPendingButton(plSplitData.markInHouseTimeout);
  await plOverview.clickBack();

  console.log(`\n✅ PO ${poNumber} marked as In-House`);
}

// ── Phase 3: Collect inventory data for one PO ────────────────────
/**
 * Re-searches until every split line shows up — inventory records for many lines can lag.
 * @param {import('@playwright/test').Page} page
 * @param {InventoryViewPage} inventoryView
 * @param {string} poNumber
 * @param {number} expectedLines
 */
async function runInventoryCollection(page, inventoryView, poNumber, expectedLines) {
  if (plSplitData.consolidatedBarcode) {
    return runConsolidatedInventoryCollection(page, inventoryView, poNumber);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  COLLECTING INVENTORY DATA FOR PO: ${poNumber} (expecting ${expectedLines} line(s))`);
  console.log(`${'═'.repeat(50)}\n`);

  let rows = [];
  for (let attempt = 1; attempt <= plSplitData.inventoryRetries; attempt++) {
    await inventoryView.searchByPONumber(poNumber);
    rows = await inventoryView.collectRowData(poNumber);
    if (rows.length >= expectedLines) break;

    console.log(`  ⚠️ Attempt ${attempt}: ${rows.length}/${expectedLines} line(s) found — ` +
                `retrying in ${plSplitData.inventoryRetryWait / 1000}s...`);
    await page.waitForTimeout(plSplitData.inventoryRetryWait);
  }

  if (rows.length < expectedLines) {
    console.log(`  ⚠️ Only ${rows.length}/${expectedLines} line(s) found for PO ${poNumber} — continuing with what was found`);
  }

  for (const row of rows) {
    addResult(row.poNumber, row.grnEntryNumber, row.scanBarcode);
  }

  console.log(`\n✅ Data collected for PO: ${poNumber} (${rows.length} line(s))`);
}

/**
 * Consolidated barcode: every line ends up sharing one Scan Barcode + GRN Entry Number, so only
 * page 1 is read. The app rewrites the per-line barcodes slowly — search again until every
 * barcode on page 1 is the same.
 * @param {import('@playwright/test').Page} page
 * @param {InventoryViewPage} inventoryView
 * @param {string} poNumber
 */
async function runConsolidatedInventoryCollection(page, inventoryView, poNumber) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  READING CONSOLIDATED BARCODE FOR PO: ${poNumber}`);
  console.log(`${'═'.repeat(50)}\n`);

  const started  = Date.now();
  const deadline = started + plSplitData.consolidatedWaitTimeout;
  const elapsed  = () => `${Math.round((Date.now() - started) / 1000)}s`;
  let row      = null;
  let knownGrn = '';   // the GRN Entry Number goes blank once the consolidated barcode is applied — keep the last one seen

  for (let attempt = 1; ; attempt++) {
    row = null;
    try {
      await inventoryView.searchByPONumber(poNumber);
      row = await inventoryView.readConsolidatedRow(poNumber);
    } catch (e) {
      console.log(`  ⚠️ Search ${attempt}: ${e.message.split('\n')[0]}`);
    }

    if (row && row.grns.length) {
      if (row.grns.length > 1) console.log(`  ⚠️ ${row.grns.length} GRN entries on page 1: ${row.grns.join(', ')} — using ${row.grns[0]}`);
      if (knownGrn !== row.grns[0]) console.log(`  → GRN Entry Number: ${row.grns[0]}`);
      knownGrn = row.grns[0];
    }

    if (row && row.barcodes.length === 1) break;

    const state = !row
      ? 'no inventory record yet'
      : `${row.barcodes.length} different barcodes on page 1 — still updating`;
    if (Date.now() + plSplitData.consolidatedRetryWait > deadline) {
      throw new Error(`PO ${poNumber}: ${state} after ${elapsed()} — consolidated barcode not applied`);
    }
    console.log(`  ⚠️ Search ${attempt} (${elapsed()}): ${state} — searching again in ${plSplitData.consolidatedRetryWait / 1000}s...`);
    await page.waitForTimeout(plSplitData.consolidatedRetryWait);
  }

  const grnEntryNumber = row.grnEntryNumber || knownGrn;
  if (!grnEntryNumber) {
    throw new Error(`PO ${poNumber}: consolidated barcode ${row.scanBarcode} found, but no GRN Entry Number was ever shown — ` +
                    'cannot pick the GRN entry on the device');
  }

  console.log(`  📌 Consolidated barcode: ${row.scanBarcode} | GRN: ${grnEntryNumber}` +
              `${row.grnEntryNumber ? '' : ' (from an earlier search)'} — all ${row.rowCount} line(s) on page 1 match, after ${elapsed()}`);
  addResult(row.poNumber, grnEntryNumber, row.scanBarcode);
  console.log(`\n✅ Consolidated barcode recorded for PO: ${poNumber}`);
}

// ── Phase 4: Mobile device scanning session ───────────────────────
/**
 * @param {import('@playwright/test').BrowserContext} deviceContext
 * @param {{ poNumber: string, grnEntryNumber: string, scanBarcode: string }[]} collectedData
 */
async function runDeviceScanning(deviceContext, collectedData) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  STARTING DEVICE SCANNING SESSION (${collectedData.length} barcode(s))`);
  console.log(`${'═'.repeat(50)}\n`);

  const devicePage  = await deviceContext.newPage();
  const deviceLogin = new DeviceLoginPage(devicePage);
  const deviceScan  = new DeviceScanPage(devicePage);

  await deviceLogin.goto(APP_URL);
  await deviceLogin.login(DEV_USERNAME, DEV_PASSWORD);

  await deviceScan.clickStart();
  await deviceScan.enterStartBarcode(deviceData.startBarcode);
  await deviceScan.waitForEntryDropdown();

  // Same GRN entry can cover multiple barcodes — select each once
  const grnEntryNumbers = [...new Set(collectedData.map(d => d.grnEntryNumber))];
  await deviceScan.selectAllGRNEntries(grnEntryNumbers);

  await deviceScan.clickProceed();

  const scanBarcodes = collectedData.map(d => d.scanBarcode);

  if (plSplitData.consolidatedBarcode) {
    // One barcode covers every line — wait for its success message, however long it takes
    for (const barcode of scanBarcodes) {
      await deviceScan.scanAndWaitForSuccess(barcode, plSplitData.scanSuccessTimeout);
    }
  } else {
    // Waits for the "Item Scanned" counter after each barcode — scans submitted too quickly get dropped
    const failed = await deviceScan.scanBarcodesConfirmed(scanBarcodes);
    if (failed.length) {
      console.log(`  ⚠️ ${failed.length} barcode(s) not registered: ${failed.join(', ')}`);
      console.log(`     Rescan them later with: $env:PO='<po>'; npm run rescan`);
    }
  }

  await deviceScan.waitForScanningCompleteAndConfirm();

  await devicePage.close();
  console.log('\n✅ Device scanning session complete');
}

// ── Phase 5: Confirm GRN for each PO ─────────────────────────────
/**
 * @param {import('@playwright/test').Page} page
 * @param {string[]} poNumbers
 */
async function runConfirmGRN(page, poNumbers) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log('  STARTING CONFIRM GRN PHASE');
  console.log(`${'═'.repeat(50)}\n`);

  // A long scan session can outlive the main window's login — sign in again if it was dropped
  const loginPage = new GRNLoginPage(page);
  if (await loginPage.usernameInput.isVisible().catch(() => false)) {
    console.log('  ⚠️ Main window was logged out — signing in again');
    await loginPage.login(GRN_USERNAME, GRN_PASSWORD);
    await page.waitForTimeout(3000);
    const warehousePage = new WarehouseSelectionPage(page);
    await warehousePage.selectWarehouse();
    await warehousePage.clickRawMaterialWarehouse();
  }

  // Open Confirm GRN by URL — works whatever state the side menu is in
  const confirmGRN = new ConfirmGRNPage(page);
  await page.goto(new URL('/raw-material/delivery/confirm-filtered', page.url()).href, { waitUntil: 'networkidle' });
  console.log('✅ Navigated to Confirm GRN');

  for (const poNumber of poNumbers) {
    console.log(`\n  → Confirming GRN for PO: ${poNumber}`);

    await confirmGRN.enterPOAndClickNext(poNumber);

    // Expect as many Completed rows as there are Pending rows now (falls back to the PL line count)
    await confirmGRN.refreshTable();
    const pendingRows = await confirmGRN.countRowsAllPages();
    const expected    = pendingRows || countLines(splitResults[poNumber]);
    console.log(`  → ${pendingRows} row(s) pending for PO ${poNumber}`);

    await confirmGRN.selectAllPagesAndUpdate(plSplitData.updateM3Wait);
    await confirmGRN.waitForCompletedRows(expected, {
      timeout:  plSplitData.completedTimeout,
      interval: plSplitData.completedCheckInterval,
    });
    await confirmGRN.clickGoBack();

    console.log(`  ✅ GRN confirmed for PO: ${poNumber}`);
  }
}

// ── Phase 3–5 (scanVia 'api'): one PO at a time ──────────────────
/**
 * Inventory → every barcode of the PO → location-update API → Confirm GRN (waits for Completed).
 * @param {import('@playwright/test').Page} page
 * @param {InventoryViewPage} inventoryView
 * @param {LocationUpdateApi} api
 * @param {string} poNumber
 */
async function runApiScanAndConfirm(page, inventoryView, api, poNumber) {
  const log = msg => console.log(`  [${poNumber}] ${msg}`);
  const expectedLines = countLines(splitResults[poNumber] || []);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  API SCAN + CONFIRM GRN FOR PO: ${poNumber} (${expectedLines} line(s))`);
  console.log(`${'═'.repeat(50)}\n`);

  // a. Inventory: read every page — retry until all split lines are there
  await page.goto(new URL('/raw-material/inventory/inventory-view', page.url()).href, { waitUntil: 'networkidle' });
  await inventoryView.enablePONumberColumn();

  let rows = [];
  for (let attempt = 1; attempt <= plSplitData.inventoryRetries; attempt++) {
    try {
      await inventoryView.searchByPONumber(poNumber);
      rows = await inventoryView.collectScanStatus(poNumber);
    } catch (e) {
      log(`⚠️ Search ${attempt}: ${e.message.split('\n')[0]}`);
    }
    if (rows.length >= expectedLines) break;
    log(`⚠️ Attempt ${attempt}: ${rows.length}/${expectedLines} line(s) in Inventory View — retrying in ${plSplitData.inventoryRetryWait / 1000}s...`);
    await page.waitForTimeout(plSplitData.inventoryRetryWait);
  }
  if (!rows.length) throw new Error(`PO ${poNumber}: no inventory rows found`);
  if (rows.length < expectedLines) log(`⚠️ Only ${rows.length}/${expectedLines} line(s) found — continuing with those`);

  const toScan = [...new Set(rows.filter(r => !r.locationName).map(r => r.scanBarcode))];
  log(`${rows.length} line(s) in inventory — ${rows.length - toScan.length} already have a location, ${toScan.length} to scan`);

  // b. location-update API
  if (toScan.length) {
    const { updated, failed } = await api.updateLocation(toScan, log);
    if (failed.length) {
      const codes = [...new Set(failed.map(f => f.code || f.message))].join(', ');
      throw new Error(`PO ${poNumber}: ${failed.length} barcode(s) not updated (${codes}) — e.g. ${failed.slice(0, 5).map(f => f.barcode).join(', ')}`);
    }
    log(`✅ ${updated}/${toScan.length} barcode(s) updated to location ${plSplitData.scanApi.locationId}`);
  }

  // c. Confirm GRN for this PO only — waits until its lines are Completed
  await runConfirmGRN(page, [poNumber]);
}

function printSplitSummary() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('✂️  PL LINE SPLIT SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  for (const [poNumber, items] of Object.entries(splitResults)) {
    console.log(`  PO ${poNumber} — ${items.length} item(s), ${countLines(items)} line(s)`);
    for (const item of items) {
      const first = item.lines[0];
      const last  = item.lines[item.lines.length - 1];
      console.log(`    ${item.itemCode} | Qty ${item.originalQty} → ${item.lines.length} × ${first.quantity}` +
                  ` | ${first.batchNo} … ${last.batchNo}`);
    }
    console.log('  ─────────────────────────────────────────────────────');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

/** @param {import('../../src/pages/grn/PLCreationPage').SplitItem[]} items */
function countLines(items) {
  return items.reduce((acc, it) => acc + it.lines.length, 0);
}

// ── Main test ──────────────────────────────────────────────────────
test.describe('GRN Flow — PL Line Split', () => {

  test('Create split PLs, Mark as In-House, Collect Inventory Data, Scan & Confirm GRN', async ({ page, browser }) => {
    test.setTimeout(0);

    // PRINT → Confirm can open the browser's print dialog, which would block the run —
    // make window.print a no-op (the barcode is generated server-side on Confirm)
    await page.context().addInitScript(() => { window.print = () => {}; });
    page.context().on('page', p => console.log(`  → New tab opened: ${p.url()}`));

    // Picks up the app's Bearer token from its own requests — used for the location-update API
    const locationApi = new LocationUpdateApi(page, plSplitData.scanApi);

    // ── Read PO numbers ──────────────────────────────────────────
    const poNumbers = readPONumbers();
    expect(poNumbers.length).toBeGreaterThan(0);
    console.log(`✂️  Each item line will be split into ${plSplitData.splitCount} line(s)`);

    // ── Login (Edge) ─────────────────────────────────────────────
    await test.step('Login to application', async () => {
      const loginPage = new GRNLoginPage(page);
      await loginPage.goto(APP_URL);
      await loginPage.login(GRN_USERNAME, GRN_PASSWORD);
      await page.waitForTimeout(3000);
    });

    // ── Select Warehouse ─────────────────────────────────────────
    await test.step('Select warehouse and enter Raw Material WH', async () => {
      const warehousePage = new WarehouseSelectionPage(page);
      await warehousePage.selectWarehouse();
      await warehousePage.clickRawMaterialWarehouse();
    });

    // ── Phase 1: Create split Packing Lists ──────────────────────
    for (let i = 0; i < poNumbers.length; i++) {
      const poNumber = poNumbers[i];
      const isFirst  = i === 0;

      await test.step(`Create split PL for PO: ${poNumber}`, async () => {
        await runPLCreationWithSplit(page, poNumber, isFirst);

        if (i < poNumbers.length - 1) {
          const plCreation = new PLCreationPage(page);
          await plCreation.clickUploadAnotherPackingList();
        }
      });
    }

    printSplitSummary();

    // TEMPORARY — see stopAfter in config/grn/plSplitData.js
    if (plSplitData.stopAfter === 'pl') {
      console.log('\n\n🛑 stopAfter=pl — split PLs created; skipping PL Overview, print, Mark as In-House and the rest');
      return;
    }

    // ── Phase 2: Mark as In-House ────────────────────────────────
    await test.step('Navigate to PL Overview', async () => {
      const plOverview = new PLOverviewPage(page);
      await plOverview.navigate();
    });

    for (const poNumber of poNumbers) {
      await test.step(`Mark as In-House for PO: ${poNumber}`, async () => {
        await runMarkAsInHouse(page, poNumber);
      });
    }

    // TEMPORARY — see stopAfter in config/grn/plSplitData.js
    if (plSplitData.stopAfter === 'inhouse') {
      console.log('\n\n🛑 stopAfter=inhouse — split PLs created and marked In-House; skipping inventory, scan and Confirm GRN');
      return;
    }

    const inventoryView = new InventoryViewPage(page);

    // ── Phase 3–5 via API: per PO — inventory barcodes → location-update → Confirm GRN ──
    if (plSplitData.scanVia === 'api') {
      for (const poNumber of poNumbers) {
        await test.step(`API scan + Confirm GRN for PO: ${poNumber}`, async () => {
          await runApiScanAndConfirm(page, inventoryView, locationApi, poNumber);
        });
      }
      console.log('\n\n🎉 All phases completed successfully!');
      return;
    }

    // ── Phase 3: Collect Inventory Data ──────────────────────────
    await test.step('Navigate to Inventory View and enable PO column', async () => {
      await inventoryView.navigate();
      await inventoryView.enablePONumberColumn();
    });

    for (const poNumber of poNumbers) {
      await test.step(`Collect inventory data for PO: ${poNumber}`, async () => {
        await runInventoryCollection(page, inventoryView, poNumber, countLines(splitResults[poNumber]));
      });
    }

    printSummary();

    // ── Phase 4: Device scanning (Edge, mobile view) ─────────────
    await test.step('Device scanning session (Edge, mobile)', async () => {
      const { edgeBrowser, deviceContext } = await launchMobileDevice(browser);

      const collectedData = getCollectedData();
      await runDeviceScanning(deviceContext, collectedData);
      await edgeBrowser.close();
    });

    // ── Phase 5: Confirm GRN ─────────────────────────────────────
    await test.step('Confirm GRN for all POs', async () => {
      await page.bringToFront();
      await runConfirmGRN(page, poNumbers);
    });

    console.log('\n\n🎉 All phases completed successfully!');
  });

});
