// Scans the consolidated barcode of every PO in po-numbers.xlsx on the device (no Confirm GRN).
// Each PO must have exactly ONE GRN Entry Number and ONE Scan Barcode in Inventory View —
// POs with none or more than one are noted down and skipped.
require('dotenv').config();
const { test }                   = require('@playwright/test');
const { GRNLoginPage }           = require('../../src/pages/grn/GRNLoginPage');
const { WarehouseSelectionPage } = require('../../src/pages/grn/WarehouseSelectionPage');
const { InventoryViewPage }      = require('../../src/pages/grn/InventoryViewPage');
const { DeviceLoginPage }        = require('../../src/pages/device/DeviceLoginPage');
const { DeviceScanPage }         = require('../../src/pages/device/DeviceScanPage');
const { readPONumbers }          = require('../../src/utils/excelReader');
const { deviceData }             = require('../../config/grn/deviceData');
const { orderData }              = require('../../config/m3/orderData');
const { plSplitData }            = require('../../config/grn/plSplitData');
const { URLS }                   = require('../../config/urls');
const { launchMobileDevice }     = require('../../src/utils/mobileDevice');

const env          = orderData.env;
const APP_URL      = URLS[env].GRN;
const GRN_USERNAME = process.env.GRN_USERNAME;
const GRN_PASSWORD = process.env.GRN_PASSWORD;
const DEV_USERNAME = process.env.DEVICE_USERNAME;
const DEV_PASSWORD = process.env.DEVICE_PASSWORD;

/**
 * Reads page 1 of the PO's inventory rows (every line shares one GRN + barcode) and works out
 * its single GRN + barcode.
 * @param {InventoryViewPage} inventoryView
 * @param {string} poNumber
 */
async function readPOBarcode(inventoryView, poNumber) {
  await inventoryView.searchByPONumber(poNumber);
  const rows = await inventoryView.collectScanStatus(poNumber, { maxPages: 1 });

  const grns     = [...new Set(rows.map(r => r.grnEntryNumber).filter(Boolean))];
  const barcodes = [...new Set(rows.map(r => r.scanBarcode).filter(Boolean))];
  const blankGrn = rows.filter(r => !r.grnEntryNumber).length;
  const scanned  = rows.filter(r => r.locationName).length;

  let problem = '';
  if (!rows.length)               problem = 'no inventory rows';
  else if (grns.length === 0)     problem = 'no GRN Entry Number on any line';
  else if (grns.length > 1)       problem = `${grns.length} GRN numbers: ${grns.join(', ')}`;
  else if (barcodes.length === 0) problem = `no barcode for GRN ${grns[0]}`;
  else if (barcodes.length > 1)   problem = `${barcodes.length} barcodes for GRN ${grns[0]}: ${barcodes.join(', ')}`;
  else if (scanned === rows.length) problem = `already scanned (all ${rows.length} line(s) on page 1 have a location)`;

  return { poNumber, grn: grns[0] || '', barcode: barcodes[0] || '', lines: rows.length, blankGrn, scanned, problem };
}

test.describe('GRN — consolidated barcode scan', () => {

  test('Scan each PO\'s single consolidated barcode', async ({ page, browser }) => {
    test.setTimeout(0);
    const poNumbers = readPONumbers();

    await test.step('Login and select warehouse', async () => {
      const loginPage = new GRNLoginPage(page);
      await loginPage.goto(APP_URL);
      await loginPage.login(GRN_USERNAME, GRN_PASSWORD);
      await page.waitForTimeout(3000);
      const warehousePage = new WarehouseSelectionPage(page);
      await warehousePage.selectWarehouse();
      await warehousePage.clickRawMaterialWarehouse();
    });

    // ── 1. Inventory: one GRN + one barcode per PO ─────────────────
    const inventoryView = new InventoryViewPage(page);
    await page.goto(new URL('/raw-material/inventory/inventory-view', page.url()).href, { waitUntil: 'networkidle' });
    await inventoryView.enablePONumberColumn();

    const plan = [];
    for (const poNumber of poNumbers) {
      await test.step(`Read GRN + barcode for PO: ${poNumber}`, async () => {
        let info;
        try {
          info = await readPOBarcode(inventoryView, poNumber);
        } catch (e) {
          info = { poNumber, grn: '', barcode: '', lines: 0, blankGrn: 0, scanned: 0, problem: `inventory error: ${e.message.split('\n')[0]}` };
        }
        plan.push(info);
        console.log(`  ${info.problem ? '⚠️' : '✅'} PO ${poNumber} — GRN ${info.grn || '-'} | barcode ${info.barcode || '-'} | ` +
                    `${info.lines} line(s) on page 1${info.blankGrn ? `, ${info.blankGrn} with blank GRN` : ''}` +
                    `${info.problem ? ` | NOTE: ${info.problem}` : ''}`);
      });
    }

    const toScan = plan.filter(p => !p.problem);
    console.log(`\n  → ${toScan.length} PO(s) to scan, ${plan.length - toScan.length} noted and skipped`);

    // ── 2. Device: one session per PO — select its GRN, scan its barcode, wait for success ──
    if (toScan.length) {
      const { edgeBrowser, deviceContext } = await launchMobileDevice(browser);
      const devicePage  = await deviceContext.newPage();
      const deviceLogin = new DeviceLoginPage(devicePage);
      const deviceScan  = new DeviceScanPage(devicePage);

      await deviceLogin.goto(APP_URL);
      await deviceLogin.login(DEV_USERNAME, DEV_PASSWORD);
      const deviceHome = devicePage.url();

      for (const [i, item] of toScan.entries()) {
        await test.step(`Scan PO ${item.poNumber} — ${item.barcode}`, async () => {
          console.log(`\n${'═'.repeat(50)}`);
          console.log(`  [${i + 1}/${toScan.length}] PO ${item.poNumber} | GRN ${item.grn} | ${item.barcode}`);
          console.log(`${'═'.repeat(50)}`);
          const started = Date.now();
          try {
            if (i > 0) await devicePage.goto(deviceHome, { waitUntil: 'networkidle' });
            await deviceScan.clickStart();
            await deviceScan.enterStartBarcode(deviceData.startBarcode);
            await deviceScan.waitForEntryDropdown();
            await deviceScan.selectAllGRNEntries([item.grn]);
            await deviceScan.clickProceed();
            await deviceScan.scanAndWaitForSuccess(item.barcode, plSplitData.scanSuccessTimeout);
            await deviceScan.waitForScanningCompleteAndConfirm();
            item.result = `✅ scanned (${Math.round((Date.now() - started) / 1000)}s)`;
          } catch (e) {
            item.result = `❌ ${e.message.split('\n')[0]}`;
            await devicePage.screenshot({ path: test.info().outputPath(`scan-failed-${item.poNumber}.png`) }).catch(() => {});
          }
          console.log(`  ${item.result}`);
        });
      }
      await edgeBrowser.close();
    }

    // ── Summary ────────────────────────────────────────────────────
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('📋 CONSOLIDATED SCAN SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    for (const p of plan) {
      console.log(`  PO ${p.poNumber} | GRN ${p.grn || '-'} | ${p.barcode || '-'} | ` +
                  (p.problem ? `NOTED: ${p.problem}` : p.result || 'not scanned'));
    }
    console.log('═══════════════════════════════════════════════════════\n');

    const failed = toScan.filter(p => !p.result?.startsWith('✅'));
    if (failed.length) throw new Error(`${failed.length} PO(s) not scanned: ${failed.map(p => p.poNumber).join(', ')}`);
  });

});
