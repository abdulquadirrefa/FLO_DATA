// Edit this file per run before executing `npm run data-api-generic`.
// Unlike runConfig.js (fixed to style CKF7323F4Z), every style-specific value
// here is explicit so this same script can create data for ANY style — just
// swap in the real values for the style you're creating.
//
// Fields marked "← Change" below are the ones you virtually always need to
// edit per style. Everything else has a sensible system-level default.

const cfg = {
  env: 'UAT', // ← Change: 'QA' or 'UAT'

  style:          'CKF7549S47',      // CKF7549S47← Change: the M3 style code
  retailStyle:    'F4-QF7323',       // ← Change: retail style code
  customerStyle:  'F4-QF7323',       // ← Change: usually same as retailStyle
  buyerDivision:  'LPVCKNCBFMWOMEN', // ← Change
  warehouse:      'B03',             // ← Change if this style isn't produced out of B03
  facility:       'BAL',
  season:         'FL24',            // ← Change
  buyName:        'automation',
  cpo:            'AUTO1',

  // System-level constants — rarely need to change per style
  company:          '200',
  division:         '110',
  customer:         'PVH01563',
  payer:            'BRA01108',
  invoiceRecipient: 'BRA01108',
  coResponsible:    'TESTUSER1',

  // CO line items — REQUIRED per style: supply the REAL SKUs (itemNo/color/
  // size/quantity) for whichever style you're creating. One array entry per
  // CO line; each line carries its own skus[]. These cannot be guessed —
  // they must match actual style/color/size combinations that exist in M3.
  lines: [
    {
      warehouse: 'B03',
      destination: 'AU001',
      deliveryMethod: 'AIR',
      deliveryTerm: 'FOB',
      lineType: 'D00',
      packMethod: 'C01',
      transactionReason: 'D00',
      otherz: 'S-MX-FRA-SIN -P',
      dateCode: '2026/12/28',
      salesPrice: 2.94,
      assortmentId: ' ',
      elno: '1',
      skus: [
        { itemNo: 'CKF7323F4Z00001', quantity: 250, color: 'PV01GEQSYRAH001', size: 'S' },
        { itemNo: 'CKF7323F4Z00002', quantity: 300, color: 'PV01GEQSYRAH001', size: 'M' },
        { itemNo: 'CKF7323F4Z00003', quantity: 250, color: 'PV01GEQSYRAH001', size: 'L' },
        { itemNo: 'CKF7323F4Z00004', quantity: 150, color: 'PV01GEQSYRAH001', size: 'XL' },
        { itemNo: 'CKF7323F4Z00005', quantity: 550, color: 'PV01GEQSYRAH001', size: 'XS' },
      ],
    },
  ],

  expectedScheduleCount: 3,
  adminUsername: 'testUser1@brandix.com',
  poApprovalUserId: 'SHASHININ',

  // Item type / procurement group combos run against every created schedule.
  // These are generally style-independent (same BOM categories), but can be
  // overridden per style if its BOM uses different procurement groups.
  popPoLogic: [
    { itemType: 'B02', procurementGroups: ['WFT'] },
    { itemType: 'B03', procurementGroups: ['THR'] },
    { itemType: 'B03', procurementGroups: ['ELS', 'LBL', 'RNG', 'ADH'] },
    { itemType: 'B04', procurementGroups: ['CTN', 'STK', 'TAG', 'TPP', 'HNG', 'PLB', 'TGP'] },
  ],
};

module.exports = { cfg };
