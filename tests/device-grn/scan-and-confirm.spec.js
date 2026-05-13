require('dotenv').config();
const { test }           = require('@playwright/test');
const { GRNLogin }       = require('../../pages/grn/GRNLogin');
const { DeviceLoginPage }= require('../../pages/device/DeviceLoginPage');
const { DeviceScanPage } = require('../../pages/device/DeviceScanPage');
const { ConfirmGRNPage } = require('../../pages/grn/ConfirmGRNPage');
const { deviceData }     = require('../../config/m3/deviceData');
const { orderData }      = require('../../config/m3/orderData');
const { URLS }           = require('../../config/m3/urls');

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

const poNumbers      = collectedData.map(d => d.poNumber);
const grnEntryNumbers = [...new Set(collectedData.map(d => d.grnEntryNumber))];
const scanBarcodes   = collectedData.map(d => d.scanBarcode);

test.describe('Scan + Confirm GRN (recovery run)', () => {

  test('Phase 4: Device scanning  →  Phase 5: Confirm GRN', async ({ page, browser }) => {
    test.setTimeout(0);

    // ── Login to GRN on Chrome (needed for Phase 5) ───────────────
    await test.step('Login to GRN app (Chrome)', async () => {
      const loginPage = new GRNLogin(page);
      await loginPage.goto(APP_URL);
      await loginPage.login(GRN_USERNAME, GRN_PASSWORD);
      await page.waitForTimeout(3000);
    });

    // ── Phase 4: Device scanning (Edge, mobile view) ──────────────
    await test.step('Device scanning (Edge, mobile)', async () => {
      const edgeBrowser = await browser.browserType().launch({
        channel: 'msedge',
        headless: false,
      });

      const deviceContext = await edgeBrowser.newContext({
        viewport:           { width: 390, height: 844 },
        userAgent:          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        ignoreHTTPSErrors:  true,   // ← fix: QA keycloak has SSL cert issues
      });

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
        await confirmGRN.selectAllRowsViaHeaderCheckbox();
        await confirmGRN.clickUpdateM3();
        await confirmGRN.verifyCompletedTab();
        await confirmGRN.clickGoBack();
        console.log(`  ✅ GRN confirmed for PO: ${poNumber}`);
      }
    });

    console.log('\n\n🎉 Recovery run complete — all POs scanned and confirmed!');
  });

});
