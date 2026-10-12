require('dotenv').config();
const { test, expect } = require('@playwright/test');
const { orderData } = require('../../config/m3/orderData');
const { grnCfg } = require('../../config/grn/grnConfig');
const { readCreatedData, writeCreatedData } = require('../../src/utils/writeCreatedData');
const { grnPurchaseOrders } = require('../../src/api/grn/grnApiFlow');

const env = orderData.env;

// API GRN for POs that already exist and are approved — PL creation → Mark as In-House →
// scan → Confirm GRN (Update M3), no browser. Invoice number = PO number, one PL line per PO line.
//
// Which POs:
//   $env:PO='1010050977,1010050978'; npm run grn-api   → just those
//   npm run grn-api                                    → every PO in data/m3/created-data.xlsx
//                                                        (the last `npm run data-api` run), and the
//                                                        GRN Status column there is updated
test.describe('GRN (API)', () => {
  test('GRN every PO', async () => {
    test.setTimeout(90 * 60 * 1000);

    const fromEnv = (process.env.PO || '').split(/[\s,]+/).filter(Boolean);
    const created = fromEnv.length ? [] : readCreatedData();
    const poNumbers = fromEnv.length ? fromEnv : created.map((r) => r.poNumber);
    expect(poNumbers.length, 'No POs — set $env:PO or run npm run data-api first').toBeGreaterThan(0);
    console.log(`POs: ${poNumbers.join(', ')}`);

    const results = await grnPurchaseOrders(env, grnCfg, poNumbers, {
      username: process.env.GRN_USERNAME,
      password: process.env.GRN_PASSWORD,
    });

    if (created.length) {
      const byPo = new Map(results.map((r) => [r.poNumber, r.status]));
      writeCreatedData(created.map((r) => ({ ...r, grnStatus: byPo.get(r.poNumber) ?? r.grnStatus })));
    }

    console.log('\n──────── GRN summary ────────');
    for (const r of results) console.log(`  ${r.ok ? '✅' : '❌'} ${r.poNumber} — ${r.status}`);

    const failed = results.filter((r) => !r.ok);
    expect(failed.map((r) => r.poNumber), 'POs that failed GRN').toEqual([]);
  });
});
