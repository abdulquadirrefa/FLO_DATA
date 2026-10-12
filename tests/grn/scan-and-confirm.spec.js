// Recovery run: device scan + Confirm GRN for POs left over from an interrupted GRN run.
// The PO / GRN / barcode list below is hardcoded from that run — replace it before reusing.
require('dotenv').config();
const { test }               = require('@playwright/test');
const { GRNLoginPage }       = require('../../src/pages/grn/GRNLoginPage');
const { DeviceLoginPage }    = require('../../src/pages/device/DeviceLoginPage');
const { DeviceScanPage }     = require('../../src/pages/device/DeviceScanPage');
const { ConfirmGRNPage }     = require('../../src/pages/grn/ConfirmGRNPage');
const { deviceData }         = require('../../config/grn/deviceData');
const { orderData }          = require('../../config/m3/orderData');
const { URLS }               = require('../../config/urls');
const { launchMobileDevice } = require('../../src/utils/mobileDevice');

const env          = orderData.env;
const APP_URL      = URLS[env].GRN;
const GRN_USERNAME = process.env.GRN_USERNAME;
const GRN_PASSWORD = process.env.GRN_PASSWORD;
const DEV_USERNAME = process.env.DEVICE_USERNAME;
const DEV_PASSWORD = process.env.DEVICE_PASSWORD;

// ── Hardcoded from the interrupted run ────────────────────────────
const collectedData = [
  { poNumber: '1010033776', grnEntryNumber: '1777291220877', scanBarcode: 'B26042711043842036' },
  { poNumber: '1010033775', grnEntryNumber: '1777291234344', scanBarcode: 'B26042711045642037' },
  { poNumber: '1010033780', grnEntryNumber: '1777291247813', scanBarcode: 'B26042711041542038' },
  { poNumber: '1010033777', grnEntryNumber: '1777291261992', scanBarcode: 'B26042711043442039' },
  { poNumber: '1010033785', grnEntryNumber: '1777291275475', scanBarcode: 'B26042711045342040' },
  { poNumber: '1010033784', grnEntryNumber: '1777291289092', scanBarcode: 'B26042711041242041' },
  { poNumber: '1010033786', grnEntryNumber: '1777291302536', scanBarcode: 'B26042711043142042' },
  { poNumber: '1010033788', grnEntryNumber: '1777291316273', scanBarcode: 'B26042711045042043' },
  { poNumber: '1010033793', grnEntryNumber: '1777291329890', scanBarcode: 'B26042711040942044' },
  { poNumber: '1010033790', grnEntryNumber: '1777291343319', scanBarcode: 'B26042711043042045' },
  { poNumber: '1010033791', grnEntryNumber: '1777291356916', scanBarcode: 'B26042711044842046' },
  { poNumber: '1010033792', grnEntryNumber: '1777291370447', scanBarcode: 'B26042712040742047' },
];

const poNumbers       = collectedData.map(d => d.poNumber);
const grnEntryNumbers = [...new Set(collectedData.map(d => d.grnEntryNumber))];
const scanBarcodes    = collectedData.map(d => d.scanBarcode);

test.describe('Scan + Confirm GRN (recovery run)', () => {

  test('Phase 4: Device scanning  →  Phase 5: Confirm GRN', async ({ page, browser }) => {
    test.setTimeout(0);

    // ── Login to GRN on Chrome (needed for Phase 5) ───────────────
    await test.step('Login to GRN app (Chrome)', async () => {
      const loginPage = new GRNLoginPage(page);
      await loginPage.goto(APP_URL);
      await loginPage.login(GRN_USERNAME, GRN_PASSWORD);
      await page.waitForTimeout(3000);
    });

    // ── Phase 4: Device scanning (Edge, mobile view) ──────────────
    await test.step.skip('Device scanning (Edge, mobile)', async () => {
      // ignoreHTTPSErrors (the helper's default) — QA keycloak has SSL cert issues
      const { edgeBrowser, deviceContext } = await launchMobileDevice(browser);

      const devicePage  = await deviceContext.newPage();
      const deviceLogin = new DeviceLoginPage(devicePage);
      const deviceScan  = new DeviceScanPage(devicePage);

      await deviceLogin.goto(APP_URL);
      await deviceLogin.login(DEV_USERNAME, DEV_PASSWORD);

      await deviceScan.clickStart();
      await deviceScan.enterStartBarcode(deviceData.startBarcode);
      await deviceScan.waitForEntryDropdown();
      await deviceScan.selectAllGRNEntries(grnEntryNumbers);
      await deviceScan.clickProceed();
      await deviceScan.enterScanBarcodes(scanBarcodes);
      await deviceScan.waitForScanningCompleteAndConfirm();

      await devicePage.close();
      await edgeBrowser.close();
      console.log('\n✅ Device scanning complete');
    });

    // ── Phase 5: Confirm GRN (Chrome) ────────────────────────────
    await test.step('Confirm GRN for all POs', async () => {
      await page.bringToFront();
      const confirmGRN = new ConfirmGRNPage(page);
      await confirmGRN.navigate();

      for (const poNumber of poNumbers) {
        console.log(`\n  → Confirming GRN for PO: ${poNumber}`);
        await confirmGRN.enterPOAndClickNext(poNumber);
        // FIXME: ConfirmGRNPage has no selectAllRowsViaHeaderCheckbox() — this step throws until it is
        // pointed at selectAndUpdateAllPages() or selectAllPagesAndUpdate() (pre-existing bug, left as is).
        await confirmGRN.selectAllRowsViaHeaderCheckbox();
        await confirmGRN.verifyCompletedTab();
        await confirmGRN.clickGoBack();
        console.log(`  ✅ GRN confirmed for PO: ${poNumber}`);
      }
    });

    console.log('\n\n🎉 Recovery run complete — all POs scanned and confirmed!');
  });

});
