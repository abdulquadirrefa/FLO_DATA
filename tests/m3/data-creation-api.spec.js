require('dotenv').config();
const { test, expect } = require('@playwright/test');
const { orderData } = require('../../config/m3/orderData');
const { cfg } = require('../../config/m3/runConfig');
const { grnCfg } = require('../../config/grn/grnConfig');
const { writeCreatedData } = require('../../src/utils/writeCreatedData');
const flow = require('../../src/api/m3/dataCreationApiFlow');
const { grnPurchaseOrders } = require('../../src/api/grn/grnApiFlow');

const env = orderData.env;

// Full API port of TCSFCS01A_AutomationDataCreationWorkFlow_API.java — direct
// GraphQL calls (no browser), covering CO creation through PO approval and
// schedule release, then GRN for every PO (src/api/grn/grnApiFlow.js). Long
// mandatory waits are ported 1:1 from the Java source, so a full run
// legitimately takes a long time.
test.describe('SFCS Data Creation (API)', () => {
  test('Full data-creation pipeline', async () => {
    test.setTimeout(120 * 60 * 1000);

    let coNumber;
    await test.step('Create CO header', async () => {
      coNumber = await flow.createCoHeader(env, cfg);
      console.log(`CO Number: ${coNumber}`);
    });

    await test.step('Create CO lines', async () => {
      await flow.createCoLines(env, cfg, coNumber);
    });

    await test.step('Release CO for costing', async () => {
      await flow.releaseForCosting(env, cfg, coNumber);
    });

    await test.step('Approve costing', async () => {
      await flow.approveCostingForCo(env, cfg, coNumber);
    });

    await test.step('Add schedule', async () => {
      await flow.addSchedule(env, cfg, coNumber);
    });

    let scheduleList = [];
    await test.step('Search schedules', async () => {
      scheduleList = await flow.searchSchedules(env, cfg, coNumber);
      console.log(`Schedules: ${scheduleList.join(', ')}`);
    });

    const createdRecords = [];
    const poNumberSet = new Set();

    for (let i = 0; i < scheduleList.length; i++) {
      const scheduleNo = scheduleList[i];

      for (let j = 0; j < cfg.popPoLogic.length; j++) {
        const row = cfg.popPoLogic[j];
        const k = i * cfg.popPoLogic.length + j;
        const templateFileName = cfg.poTemplateFiles[k];

        await test.step(`Schedule ${scheduleNo} - ${row.itemType}/${row.procurementGroups.join(',')}`, async () => {
          const searchResponse = await flow.searchPopLines(env, cfg, scheduleNo, row.itemType, row.procurementGroups);
          const { itemCodes } = await flow.createPurchaseOrders(
            env, cfg, scheduleNo, row.itemType, row.procurementGroups, templateFileName, searchResponse
          );

          for (const itemCode of itemCodes) {
            const poNumber = await flow.getCreatedPoNumber(env, cfg, scheduleNo, itemCode);
            if (poNumber && !poNumberSet.has(poNumber)) {
              poNumberSet.add(poNumber);
              createdRecords.push({
                coNumber,
                scheduleNumber: scheduleNo,
                itemType: row.itemType,
                procurementGroup: row.procurementGroups.join(','),
                poNumber,
              });
            }
          }
        });
      }
    }

    console.log(`PO Numbers: ${[...poNumberSet].join(', ')}`);

    await test.step('Approve PO numbers', async () => {
      for (const poNumber of poNumberSet) {
        await flow.approvePoNumber(env, cfg, poNumber);
      }
    });

    await test.step('Release schedules', async () => {
      for (const scheduleNo of scheduleList) {
        await flow.releaseScheduleNo(env, cfg, coNumber, scheduleNo);
      }
    });

    // Written before GRN so the created POs are on record even if GRN fails
    await test.step('Write created data', async () => {
      writeCreatedData(createdRecords);
    });

    // The GRN part TCSFCS01A has commented out: PL → In-House → scan → Confirm GRN, every PO
    let grnResults = [];
    await test.step('GRN every PO', async () => {
      grnResults = await grnPurchaseOrders(env, grnCfg, [...poNumberSet], {
        username: process.env.GRN_USERNAME,
        password: process.env.GRN_PASSWORD,
      });
      const byPo = new Map(grnResults.map((r) => [r.poNumber, r.status]));
      writeCreatedData(createdRecords.map((r) => ({ ...r, grnStatus: byPo.get(r.poNumber) })));
    });

    console.log('\n──────── GRN summary ────────');
    for (const r of grnResults) console.log(`  ${r.ok ? '✅' : '❌'} ${r.poNumber} — ${r.status}`);
    console.log('----- End of SFCS Data Creation (API) -----');

    expect(grnResults.filter((r) => !r.ok).map((r) => r.poNumber), 'POs that failed GRN — rerun them with npm run grn-api').toEqual([]);
  });
});
