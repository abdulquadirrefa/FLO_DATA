// Confirms GRN for every PO in po-numbers.xlsx, several POs at a time — one browser tab per PO.
// Per PO: Confirm GRN → PO → Next → count Pending → header checkbox → Select All Pages → Yes → Update M3
//         → reload Completed until every Pending line shows there.
require('dotenv').config();
const { test }                   = require('@playwright/test');
const { GRNLoginPage }           = require('../../src/pages/grn/GRNLoginPage');
const { WarehouseSelectionPage } = require('../../src/pages/grn/WarehouseSelectionPage');
const { ConfirmGRNPage }         = require('../../src/pages/grn/ConfirmGRNPage');
const { readPONumbers }          = require('../../src/utils/excelReader');
const { orderData }              = require('../../config/m3/orderData');
const { plSplitData }            = require('../../config/grn/plSplitData');
const { URLS }                   = require('../../config/urls');

const env          = orderData.env;
const APP_URL      = URLS[env].GRN;
const GRN_USERNAME = process.env.GRN_USERNAME;
const GRN_PASSWORD = process.env.GRN_PASSWORD;
const TABS         = 5;     // POs confirmed at the same time

// Optional overrides (PowerShell: $env:POS='1010050908,1010050909'):
//   POS                   → comma-separated POs instead of po-numbers.xlsx
//   VERIFY_ONLY=1         → don't click Update M3 — only wait for Completed to reach EXPECTED_LINES
//   NO_WAIT=1             → click Update M3 and move straight on (no Completed check) — verify later with VERIFY_ONLY
//   EXPECTED_LINES        → total lines to expect in Completed (default: VERIFY_ONLY → splitCount, else the Pending count)
//   COMPLETED_TIMEOUT_MIN → minutes to keep reloading Completed (default: plSplitData.completedTimeout)
const PO_OVERRIDE       = (process.env.POS || '').split(',').map(s => s.trim()).filter(Boolean);
const VERIFY_ONLY       = !!process.env.VERIFY_ONLY;
const NO_WAIT           = !!process.env.NO_WAIT;
const EXPECTED_LINES    = Number(process.env.EXPECTED_LINES) || 0;
const COMPLETED_TIMEOUT = (Number(process.env.COMPLETED_TIMEOUT_MIN) * 60000) || plSplitData.completedTimeout;

/**
 * Opens Confirm GRN in a tab, signing in / picking the warehouse again if the tab needs it.
 * @param {import('@playwright/test').Page} tab
 */
async function openConfirmGRN(tab) {
  const confirmUrl = new URL('/raw-material/delivery/confirm-filtered', APP_URL).href;

  for (let attempt = 1; attempt <= 3; attempt++) {
    await tab.goto(confirmUrl, { waitUntil: 'networkidle' });

    const login = new GRNLoginPage(tab);
    if (await login.usernameInput.isVisible().catch(() => false)) {
      await login.login(GRN_USERNAME, GRN_PASSWORD);
      await tab.waitForTimeout(3000);
    }
    if (tab.url().includes('select-warehouse')) {
      const warehouse = new WarehouseSelectionPage(tab);
      await warehouse.selectWarehouse();
      await warehouse.clickRawMaterialWarehouse();
      continue;   // go back to Confirm GRN now the warehouse is set
    }
    if (tab.url().includes('confirm-filtered')) return;
  }
  throw new Error(`Could not open Confirm GRN (ended on ${tab.url()})`);
}

/**
 * @param {import('@playwright/test').Page} tab
 * @param {string} poNumber
 */
async function confirmPO(tab, poNumber) {
  const log     = msg => console.log(`  [${poNumber}] ${msg}`);
  const started = Date.now();
  const result  = { poNumber, pending: 0, completed: 0, status: '' };

  try {
    await openConfirmGRN(tab);
    const confirmGRN = new ConfirmGRNPage(tab);
    await confirmGRN.enterPOAndClickNext(poNumber);

    await confirmGRN.refreshTable();
    result.pending = await confirmGRN.countRowsAllPages();
    log(`${result.pending} line(s) pending`);

    // Total expected in Completed — when part of the PO is already completed, pass EXPECTED_LINES (e.g. 800)
    let expected = EXPECTED_LINES || (VERIFY_ONLY ? plSplitData.splitCount : result.pending);
    if (VERIFY_ONLY) {
      log(`VERIFY_ONLY — not clicking Update M3; waiting for ${expected} line(s) in Completed`);
    } else {
      if (!result.pending) {
        result.status = '⚠️ nothing pending — not updated';
        return result;
      }
      await confirmGRN.selectAllPagesAndUpdate(plSplitData.updateM3Wait);
      if (NO_WAIT) {
        result.status = `⏳ Update M3 clicked for ${result.pending} pending line(s) — not waiting (verify later)`;
        log(result.status);
        return result;
      }
      log('Update M3 clicked — checking Completed...');
    }

    await confirmGRN.waitForCompletedRows(expected, {
      timeout:  COMPLETED_TIMEOUT,
      interval: plSplitData.completedCheckInterval,
    });
    result.completed = expected;
    result.status    = `✅ ${expected}/${expected} completed (${Math.round((Date.now() - started) / 1000)}s)`;
  } catch (e) {
    result.status = `❌ ${e.message.split('\n')[0]}`;
    await tab.screenshot({ path: test.info().outputPath(`confirm-failed-${poNumber}.png`) }).catch(() => {});
  }
  log(result.status);
  return result;
}

test.describe('GRN — Confirm GRN in parallel tabs', () => {

  test(`Confirm GRN for every PO, ${TABS} at a time`, async ({ page }) => {
    test.setTimeout(0);
    const poNumbers = PO_OVERRIDE.length ? PO_OVERRIDE : readPONumbers();
    console.log(`📋 ${poNumbers.length} PO(s): ${poNumbers.join(', ')}${VERIFY_ONLY ? ' — VERIFY_ONLY' : ''}${NO_WAIT ? ' — NO_WAIT' : ''} | ` +
                `Completed wait ${COMPLETED_TIMEOUT / 60000} min`);

    await test.step('Login and select warehouse', async () => {
      const loginPage = new GRNLoginPage(page);
      await loginPage.goto(APP_URL);
      await loginPage.login(GRN_USERNAME, GRN_PASSWORD);
      await page.waitForTimeout(3000);
      const warehousePage = new WarehouseSelectionPage(page);
      await warehousePage.selectWarehouse();
      await warehousePage.clickRawMaterialWarehouse();
    });

    // One tab per slot — the first is the logged-in page, the rest share its session
    const tabs = [page];
    while (tabs.length < Math.min(TABS, poNumbers.length)) tabs.push(await page.context().newPage());

    const results = [];
    for (let start = 0; start < poNumbers.length; start += TABS) {
      const batch = poNumbers.slice(start, start + TABS);
      await test.step(`Batch ${start / TABS + 1}: ${batch.join(', ')}`, async () => {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`  BATCH ${start / TABS + 1}: ${batch.join(', ')}`);
        console.log(`${'═'.repeat(60)}`);
        results.push(...await Promise.all(batch.map((po, i) => confirmPO(tabs[i], po))));
      });
    }

    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('📋 CONFIRM GRN SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    for (const r of results) console.log(`  PO ${r.poNumber} | pending ${r.pending} | ${r.status}`);
    console.log('═══════════════════════════════════════════════════════\n');

    const failed = results.filter(r => !r.status.startsWith('✅') && !r.status.startsWith('⏳'));
    if (failed.length) throw new Error(`${failed.length} PO(s) not confirmed: ${failed.map(r => r.poNumber).join(', ')}`);
  });

});
