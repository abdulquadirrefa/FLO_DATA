// Rescans only the barcodes of a PO that did not get scanned (e.g. after a scan session dropped mid-way).
// PowerShell:  $env:PO='1010050884'; npm run rescan            (add $env:DRY_RUN='1' to only count)
require('dotenv').config();
const { test, expect }           = require('@playwright/test');
const { GRNLoginPage }           = require('../../src/pages/grn/GRNLoginPage');
const { WarehouseSelectionPage } = require('../../src/pages/grn/WarehouseSelectionPage');
const { InventoryViewPage }      = require('../../src/pages/grn/InventoryViewPage');
const { DeviceLoginPage }        = require('../../src/pages/device/DeviceLoginPage');
const { DeviceScanPage }         = require('../../src/pages/device/DeviceScanPage');
const { deviceData }             = require('../../config/grn/deviceData');
const { orderData }              = require('../../config/m3/orderData');
const { URLS }                   = require('../../config/urls');
const { launchMobileDevice }     = require('../../src/utils/mobileDevice');

const env          = orderData.env;
const APP_URL      = URLS[env].GRN;
const GRN_USERNAME = process.env.GRN_USERNAME;
const GRN_PASSWORD = process.env.GRN_PASSWORD;
const DEV_USERNAME = process.env.DEVICE_USERNAME;
const DEV_PASSWORD = process.env.DEVICE_PASSWORD;
const PO_NUMBER    = (process.env.PO || '').trim();
const DRY_RUN      = !!process.env.DRY_RUN;

/**
 * @param {import('@playwright/test').Page} page
 * @param {InventoryViewPage} inventoryView
 */
async function readScanStatus(page, inventoryView) {
  await inventoryView.searchByPONumber(PO_NUMBER);
  const rows      = await inventoryView.collectScanStatus(PO_NUMBER);
  const remaining = rows.filter(r => !r.locationName);

  console.log(`\n  PO ${PO_NUMBER}: ${rows.length} row(s) — ${rows.length - remaining.length} scanned, ` +
              `${remaining.length} not scanned`);
  return { rows, remaining };
}

/**
 * @param {import('@playwright/test').BrowserContext} deviceContext
 * @param {{ grnEntryNumber: string, scanBarcode: string }[]} toScan
 */
async function runDeviceScanning(deviceContext, toScan) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  RESCANNING ${toScan.length} BARCODE(S)`);
  console.log(`${'═'.repeat(50)}\n`);

  const devicePage  = await deviceContext.newPage();
  const deviceLogin = new DeviceLoginPage(devicePage);
  const deviceScan  = new DeviceScanPage(devicePage);

  await deviceLogin.goto(APP_URL);
  await deviceLogin.login(DEV_USERNAME, DEV_PASSWORD);

  await deviceScan.clickStart();
  await deviceScan.enterStartBarcode(deviceData.startBarcode);
  await deviceScan.waitForEntryDropdown();

  const grnEntryNumbers = [...new Set(toScan.map(d => d.grnEntryNumber))];
  await deviceScan.selectAllGRNEntries(grnEntryNumbers);
  await deviceScan.clickProceed();

  const failed = await deviceScan.scanBarcodesConfirmed(toScan.map(d => d.scanBarcode));
  if (failed.length) console.log(`  ⚠️ Not registered: ${failed.join(', ')}`);
  await deviceScan.waitForScanningCompleteAndConfirm();

  await devicePage.close();
  console.log('\n✅ Rescan session complete');
}

test.describe('GRN Rescan — remaining barcodes', () => {

  test('Find unscanned barcodes for a PO and scan only those', async ({ page, browser }) => {
    test.setTimeout(0);
    expect(PO_NUMBER, 'Set the PO first, e.g. $env:PO=\'1010050884\'').toBeTruthy();

    await test.step('Login and select warehouse', async () => {
      const loginPage = new GRNLoginPage(page);
      await loginPage.goto(APP_URL);
      await loginPage.login(GRN_USERNAME, GRN_PASSWORD);
      await page.waitForTimeout(3000);

      const warehousePage = new WarehouseSelectionPage(page);
      await warehousePage.selectWarehouse();
      await warehousePage.clickRawMaterialWarehouse();
    });

    const inventoryView = new InventoryViewPage(page);
    let remaining = [];

    await test.step(`Read scan status for PO: ${PO_NUMBER}`, async () => {
      await page.goto(new URL('/raw-material/inventory/inventory-view', page.url()).href, { waitUntil: 'networkidle' });
      await inventoryView.enablePONumberColumn();
      ({ remaining } = await readScanStatus(page, inventoryView));
    });

    if (DRY_RUN || !remaining.length) {
      console.log(DRY_RUN ? '\n  DRY_RUN — nothing scanned' : '\n  ✅ Nothing left to scan');
      return;
    }

    await test.step(`Rescan ${remaining.length} barcode(s) (Edge, mobile)`, async () => {
      const { edgeBrowser, deviceContext } = await launchMobileDevice(browser);
      await runDeviceScanning(deviceContext, remaining);
      await edgeBrowser.close();
    });

    await test.step('Verify every barcode is now scanned', async () => {
      await page.bringToFront();
      await page.reload({ waitUntil: 'networkidle' });
      await inventoryView.enablePONumberColumn();
      const after = await readScanStatus(page, inventoryView);
      expect(after.remaining.map(r => r.scanBarcode), 'Barcodes still not scanned').toEqual([]);
    });
  });

});
