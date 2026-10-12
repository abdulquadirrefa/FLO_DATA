// Editable per-run values — JS equivalent of the Java script's Excel sheets
// (E2E / CostingSDK / ScheduleAndReleaseSDK / POP_SDK / POP_PO_LOGIC).
//
// style/buyerDivision are pinned rather than read from orderData.js: every
// template in data/m3/graphql-templates/ (CO header/lines, add/release schedule,
// POP PO samples) is hard-wired to CKF7323F4Z, so following orderData.m3Style makes
// the costing and schedule searches look for the wrong style and find nothing.
// Use runConfigGeneric.js / `npm run data-api-generic` for other styles.
const cfg = {
  style: 'CKF7323F4Z',
  buyerDivision: 'LPVCKNCBFMWOMEN', // must match the CO's buyer division (BFM, not BRM) or the POP search returns nothing
  warehouse: 'B03',
  facility: 'BAL',
  expectedScheduleCount: 3,

  // UserData.ADMIN_USERNAME in the Java source wasn't resolved during porting —
  // defaulting to the same test identity used everywhere else in this flow.
  adminUsername: 'testUser1@brandix.com',
  poApprovalUserId: 'SHASHININ',

  // Item type / procurement group combos run against every created schedule
  // (POP_PO_LOGIC sheet in the Java workbook).
  popPoLogic: [
    { itemType: 'B02', procurementGroups: ['WFT'] },
    { itemType: 'B03', procurementGroups: ['THR'] },
    { itemType: 'B03', procurementGroups: ['ELS', 'LBL', 'RNG', 'ADH'] },
    { itemType: 'B04', procurementGroups: ['CTN', 'STK', 'TAG', 'TPP', 'HNG', 'PLB', 'TGP'] },
  ],

  // PO-creation sample templates, one per (schedule index × popPoLogic row),
  // k = scheduleIndex * popPoLogic.length + rowIndex — mirrors the Java
  // `fileNames` HashMap wiring exactly.
  poTemplateFiles: [
    'aggregateViewB02ForFirstSchedule.json',
    'aggregatedViewB03THRForFirstSchedule.json',
    'aggregatedViewForB03FirstSchedule.json',
    'aggregatedViewB04ForFirstSchedule.json',
    'aggregatedViewB02ForSecondSchedule.json',
    'aggregatedViewB03THRForSecondSchedule.json',
    'aggregatedViewB03SecondSchedule.json',
    'aggregatedViewB04ForSecondSchedule.json',
    'aggregatedViewB02ForThirdSchedule.json',
    'aggregatedViewB03THRForThirdSchedule.json',
    'aggregtedViewB03ForThirdSchedule.json',
    'aggregatedViewB04ForThirdSchedule.json',
  ],
};

module.exports = { cfg };
