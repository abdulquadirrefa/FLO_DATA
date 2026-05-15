require('dotenv').config();
const readline                                          = require('readline');
const { test, expect }                                  = require('@playwright/test');
const { GRNLogin }                                      = require('../../pages/grn/GRNLogin');
const { WarehouseSelectionPage }                        = require('../../pages/grn/WarehouseSelectionPage');
const { InventoryViewPage }                             = require('../../pages/grn/InventoryViewPage');
const { DeviceLoginPage }                               = require('../../pages/device/DeviceLoginPage');
const { DeviceScanPage }                                = require('../../pages/device/DeviceScanPage');
const { ConfirmGRNPage }                                = require('../../pages/grn/ConfirmGRNPage');
const { readPONumbers }                                 = require('../../config/m3/readPONumbers');
const { addResult, printSummary, getCollectedData }     = require('../../config/m3/resultsTrackerGRN');
const { deviceData }                                    = require('../../config/m3/deviceData');
const { orderData }                                     = require('../../config/m3/orderData');
const { URLS }                                          = require('../../config/m3/urls');

const env          = orderData.env;
const APP_URL      = URLS[env].GRN;
const GRN_USERNAME = process.env.GRN_USERNAME;
const GRN_PASSWORD = process.env.GRN_PASSWORD;
const DEV_USERNAME = process.env.DEVICE_USERNAME;
const DEV_PASSWORD = process.env.DEVICE_PASSWORD;


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

  console.log(`\n✅ Data collected for PO: ${poNumber} (${rows.length} line(s))`);
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

  const devicePage  = await deviceContext.newPage();
  const deviceLogin = new DeviceLoginPage(devicePage);
  const deviceScan  = new DeviceScanPage(devicePage);

  await deviceLogin.goto(APP_URL);
  await deviceLogin.login(DEV_USERNAME, DEV_PASSWORD);

  await deviceScan.clickStart();
  await deviceScan.enterStartBarcode(deviceData.startBarcode);
  await deviceScan.waitForEntryDropdown();

  const grnEntryNumbers = [...new Set(collectedData.map(d => d.grnEntryNumber))];
  await deviceScan.selectAllGRNEntries(grnEntryNumbers);

  await deviceScan.clickProceed();

  const scanBarcodes = collectedData.map(d => d.scanBarcode);
  await deviceScan.enterScanBarcodes(scanBarcodes);

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
test.describe('GRN Scan Flow', () => {

  test('Inventory Data → Scan → Confirm GRN', async ({ page, browser }) => {
    test.setTimeout(0);

    // ── Read PO numbers from Excel ───────────────────────────────
    const poNumbers = readPONumbers();
    expect(poNumbers.length).toBeGreaterThan(0);

    // ── Login ────────────────────────────────────────────────────
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
      const edgeBrowser = await browser.browserType().launch({
        channel:   'msedge',
        headless:  false,
      });

      const deviceContext = await edgeBrowser.newContext({
        viewport:          { width: 390, height: 844 },
        userAgent:         'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        ignoreHTTPSErrors: true,
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
