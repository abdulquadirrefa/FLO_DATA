require('dotenv').config();
const { test, expect }              = require('@playwright/test');
const { GRNLogin }                  = require('../../pages/grn/GRNLogin');
const { WarehouseSelectionPage }    = require('../../pages/grn/WarehouseSelectionPage');
const { PLCreationPage }            = require('../../pages/m3/PLCreationPage');
const { PLOverviewPage }            = require('../../pages/m3/PLOverviewPage');
const { InventoryViewPage }         = require('../../pages/grn/InventoryViewPage');
const { DeviceLoginPage }           = require('../../pages/device/DeviceLoginPage');
const { DeviceScanPage }            = require('../../pages/device/DeviceScanPage');
const { ConfirmGRNPage }            = require('../../pages/grn/ConfirmGRNPage');
const { readPONumbers }             = require('../../config/m3/readPONumbers');
const { addResult, printSummary, getCollectedData } = require('../../config/m3/resultsTrackerGRN');
const { deviceData }                = require('../../config/m3/deviceData');
const { orderData }                 = require('../../config/m3/orderData');
const { URLS }                      = require('../../config/m3/urls');

const env          = orderData.env;
const APP_URL      = URLS[env].GRN;
const GRN_USERNAME = process.env.GRN_USERNAME;
const GRN_PASSWORD = process.env.GRN_PASSWORD;
const DEV_USERNAME = process.env.DEVICE_USERNAME;
const DEV_PASSWORD = process.env.DEVICE_PASSWORD;

// ── Phase 1: Create Packing List for one PO ───────────────────────
/**
 * @param {import('@playwright/test').Page} page
 * @param {string} poNumber
 * @param {boolean} isFirst
 */
async function runPLCreation(page, poNumber, isFirst) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  CREATING PL FOR PO: ${poNumber}`);
  console.log(`${'═'.repeat(50)}\n`);

  const plCreation = new PLCreationPage(page);

  if (isFirst) {
    await plCreation.navigateToPLCreation();
  }

  await plCreation.enterPONumber(poNumber);
  await plCreation.clickNext();
  await plCreation.clickCreatePackingList();
  await plCreation.fillPackingListForm(poNumber);

  // Auto Populate first, then fill BN/SP
  await plCreation.clickAutoPopulateOrderQuantity();
  await plCreation.confirmAlertYes();
  await page.waitForTimeout(2000);

  await plCreation.fillSpreadsheetColumns();

  await plCreation.clickSave();
  await plCreation.clickSaveChanges();
  await plCreation.clickSubmit();
  await plCreation.waitForSuccessMessage();

  console.log(`\n✅ PL created successfully for PO: ${poNumber}`);
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
  await plOverview.clickMarkAsInHouse();
  await plOverview.confirmAlertYes();
  await plOverview.selectAutoGenerateEntryNo();
  await plOverview.waitForMarkAsPendingButton();
  await plOverview.clickBack();

  console.log(`\n✅ PO ${poNumber} marked as In-House`);
}

// ── Phase 3: Collect inventory data for one PO ────────────────────
/**
 * @param {import('@playwright/test').Page} page
 * @param {InventoryViewPage} inventoryView
 * @param {string} poNumber
 */
async function runInventoryCollection(page, inventoryView, poNumber) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  COLLECTING INVENTORY DATA FOR PO: ${poNumber}`);
  console.log(`${'═'.repeat(50)}\n`);

  await inventoryView.searchByPONumber(poNumber);
  const rows = await inventoryView.collectRowData(poNumber);

  for (const row of rows) {
    addResult(row.poNumber, row.grnEntryNumber, row.scanBarcode);
  }

  console.log(`\n✅ Data collected for PO: ${poNumber}`);
}

// ── Phase 4: Mobile device scanning session ───────────────────────
/**
 * @param {import('@playwright/test').BrowserContext} deviceContext
 * @param {{ poNumber: string, grnEntryNumber: string, scanBarcode: string }[]} collectedData
 */
async function runDeviceScanning(deviceContext, collectedData) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log('  STARTING DEVICE SCANNING SESSION');
  console.log(`${'═'.repeat(50)}\n`);

  const devicePage   = await deviceContext.newPage();
  const deviceLogin  = new DeviceLoginPage(devicePage);
  const deviceScan   = new DeviceScanPage(devicePage);

  // Login on device browser
  await deviceLogin.goto(APP_URL);
  await deviceLogin.login(DEV_USERNAME, DEV_PASSWORD);

  // Start scanning session
  await deviceScan.clickStart();
  await deviceScan.enterStartBarcode(deviceData.startBarcode);
  await deviceScan.waitForEntryDropdown();

  // Select all GRN entry numbers from the dropdown (deduplicated — same GRN can cover multiple barcodes)
  const grnEntryNumbers = [...new Set(collectedData.map(d => d.grnEntryNumber))];
  await deviceScan.selectAllGRNEntries(grnEntryNumbers);

  // Proceed
  await deviceScan.clickProceed();

  // Enter all scan barcodes one by one
  const scanBarcodes = collectedData.map(d => d.scanBarcode);
  await deviceScan.enterScanBarcodes(scanBarcodes);

  // Wait for scanning complete dialog and confirm
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

  const confirmGRN = new ConfirmGRNPage(page);
  await confirmGRN.navigate();

  for (const poNumber of poNumbers) {
    console.log(`\n  → Confirming GRN for PO: ${poNumber}`);

    await confirmGRN.enterPOAndClickNext(poNumber);
    await confirmGRN.selectAllRowsViaHeaderCheckbox();
    await confirmGRN.clickUpdateM3();
    await confirmGRN.verifyCompletedTab();
    await confirmGRN.clickGoBack();

    console.log(`  ✅ GRN confirmed for PO: ${poNumber}`);
  }
}

// ── Main test ──────────────────────────────────────────────────────
test.describe('Raw Material PL Creation Flow', () => {

  test('Create PLs, Mark as In-House, Collect Inventory Data, Scan & Confirm GRN', async ({ page, browser }) => {
    test.setTimeout(0);

    // ── Read PO numbers ──────────────────────────────────────────
    const poNumbers = readPONumbers();
    expect(poNumbers.length).toBeGreaterThan(0);

    // ── Login (Chrome) ───────────────────────────────────────────
    await test.step('Login to application', async () => {
      const loginPage = new GRNLogin(page);
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

    // ── Phase 1: Create Packing Lists ────────────────────────────
    for (let i = 0; i < poNumbers.length; i++) {
      const poNumber = poNumbers[i];
      const isFirst  = i === 0;

      await test.step(`Create PL for PO: ${poNumber}`, async () => {
        await runPLCreation(page, poNumber, isFirst);

        if (i < poNumbers.length - 1) {
          const plCreation = new PLCreationPage(page);
          await plCreation.clickUploadAnotherPackingList();
        }
      });
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

    // ── Phase 3: Collect Inventory Data ──────────────────────────
    const inventoryView = new InventoryViewPage(page);

    await test.step('Navigate to Inventory View and enable PO column', async () => {
      await inventoryView.navigate();
      await inventoryView.enablePONumberColumn();
    });

    for (const poNumber of poNumbers) {
      await test.step(`Collect inventory data for PO: ${poNumber}`, async () => {
        await runInventoryCollection(page, inventoryView, poNumber);
      });
    }

    printSummary();

    // ── Phase 4: Device scanning (Edge, mobile view) ─────────────
    await test.step('Device scanning session (Edge, mobile)', async () => {
      // Launch a separate Edge browser instance with mobile viewport
      const edgeBrowser = await browser.browserType().launch({
        channel: 'msedge',
        headless: false,
      });

      const deviceContext = await edgeBrowser.newContext({
        viewport: { width: 390, height: 844 },   // iPhone 14 mobile dimensions
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      });

      const collectedData = getCollectedData();
      await runDeviceScanning(deviceContext, collectedData);
      await edgeBrowser.close();
    });

    // ── Phase 5: Confirm GRN (back to Chrome) ────────────────────
    await test.step('Confirm GRN for all POs', async () => {
      await page.bringToFront();
      await runConfirmGRN(page, poNumbers);
    });

    console.log('\n\n🎉 All phases completed successfully!');
  });

});
