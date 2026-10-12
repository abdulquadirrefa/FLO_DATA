require('dotenv').config();
const { test } = require('@playwright/test');
const { cfg } = require('../../config/m3/runConfigGeneric');
const { writeCreatedDataGeneric } = require('../../src/utils/writeCreatedDataGeneric');

// Reused, unmodified stage functions from the fixed-style flow — these were
// already style-agnostic (driven entirely by cfg.style/cfg.warehouse/etc).
const {
  releaseForCosting,
  approveCostingForCo,
  addSchedule,
  searchSchedules,
  releaseScheduleNo,
  searchPopLines,
  getCreatedPoNumber,
  approvePoNumber,
} = require('../../src/api/m3/dataCreationApiFlow');

// New, style-agnostic replacements for the three stages that were hardcoded
// to CKF7323F4Z's BOM in the original flow.
const {
  createCoHeaderGeneric,
  createCoLinesGeneric,
  createPurchaseOrdersGeneric,
} = require('../../src/api/m3/dataCreationApiFlowGeneric');

const env = cfg.env;

// Generic (any-style) port of TCSFCS01A_AutomationDataCreationWorkFlow_API.java.
// Separate from data-creation-api.spec.js by design — that script stays fixed to
// CKF7323F4Z; this one builds PO lines live from the POP search response so it
// works for whichever style/SKUs you put in config/m3/runConfigGeneric.js.
test.describe('SFCS Data Creation (API, Generic Style)', () => {
  test('Full data-creation pipeline for configured style', async () => {
    test.setTimeout(60 * 60 * 1000);

    let coNumber;
    await test.step(`Create CO header (style ${cfg.style})`, async () => {
      coNumber = await createCoHeaderGeneric(env, cfg);
      console.log(`CO Number: ${coNumber}`);
    });

    await test.step('Create CO lines', async () => {
      await createCoLinesGeneric(env, cfg, coNumber);
    });

    await test.step('Release CO for costing', async () => {
      await releaseForCosting(env, cfg, coNumber);
    });

    await test.step('Approve costing', async () => {
      await approveCostingForCo(env, cfg, coNumber);
    });

    await test.step('Add schedule', async () => {
      await addSchedule(env, cfg, coNumber);
    });

    let scheduleList = [];
    await test.step('Search schedules', async () => {
      scheduleList = await searchSchedules(env, cfg, coNumber);
      console.log(`Schedules: ${scheduleList.join(', ')}`);
    });

    const createdRecords = [];
    const poNumberSet = new Set();

    for (let i = 0; i < scheduleList.length; i++) {
      const scheduleNo = scheduleList[i];

      for (let j = 0; j < cfg.popPoLogic.length; j++) {
        const row = cfg.popPoLogic[j];

        await test.step(`Schedule ${scheduleNo} - ${row.itemType}/${row.procurementGroups.join(',')}`, async () => {
          const searchResponse = await searchPopLines(env, cfg, scheduleNo, row.itemType, row.procurementGroups);
          const { itemCodes } = await createPurchaseOrdersGeneric(
            env, cfg, scheduleNo, row.itemType, row.procurementGroups, searchResponse
          );

          for (const itemCode of itemCodes) {
            const poNumber = await getCreatedPoNumber(env, cfg, scheduleNo, itemCode);
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
        await approvePoNumber(env, cfg, poNumber);
      }
    });

    await test.step('Release schedules', async () => {
      for (const scheduleNo of scheduleList) {
        await releaseScheduleNo(env, cfg, coNumber, scheduleNo);
      }
    });

    await test.step('Write created data', async () => {
      writeCreatedDataGeneric(createdRecords, cfg.style);
    });

    console.log(`----- End of SFCS Data Creation (API, Generic Style ${cfg.style}) -----`);
  });
});
