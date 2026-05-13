// ─────────────────────────────────────────────────────────────────────────────
// masterPOData.js  –  Test data for the Master PO Planning full flow
// Edit style / schedule here before running.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {

  // ── Step 1: Master PO Selection search filters ────────────────────────────
  style:    'CKF7323F4Y',
  schedule: '20562',

  // ── Step 3: Job Preference ────────────────────────────────────────────────
  logicalBundleQty: '5',

  // ── Step 4: Fabric Properties ─────────────────────────────────────────────
  maxPlies: '10',

  fabricRow1: {
    purchaseWidth:  '1.00',
    fabricCategory: 'FabTrim04',
    fabricType:     'Single jersey',
    gsm:            '1',
  },

  fabricRow2: {
    purchaseWidth:  '1.00',
    fabricCategorySearch: 'mi',      // search keyword
    fabricCategory: 'MidCup',
    fabricType:     'RIB & Interlock',
    gsm:            '1',
  },

  // ── Step 7: Add Additional Qty ────────────────────────────────────────────
  sampleType:     'Pink Tag',
  sampleQty:      '1',
  processWastage: '1',

  // ── Step 9: Sub PO Ratio ──────────────────────────────────────────────────
  ratios: [
    {
      type:        'NORMAL',
      description: 'test',
      sizes:       ['10', '10', '10', '10', '10'],   // XS S M L XL
      plies:       '10',
      totalSets:   '100',
    },
    {
      type:        'NORMAL',
      description: 'test',
      sizes:       ['50', '50', '50', '50', '50'],
      plies:       '10',
    },
  ],

  // ── Step 10: Sub PO Marker Versions ───────────────────────────────────────
  markerVersions: [
    { version: '1', markerType: 'AvoidMarker', shrinkage: '1', width: '1', length: '1',  perimeter: '1' },
    { version: '2', markerType: 'AvoidMarker', shrinkage: '1', width: '1', length: '11', perimeter: '1' },
  ],

  // ── Step 12: Packing List ─────────────────────────────────────────────────
  packingMethod: {
    name:        'Test Pack',
    description: 'test',
    minQty:      '10',
    maxQty:      '50',
    sizeQty:     '5',    // quantity applied to each size
  },

  // ── Step 16: Sewing Jobs ──────────────────────────────────────────────────
  sewingJobQty: '10',
};
