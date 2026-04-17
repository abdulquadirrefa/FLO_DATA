const orderData = {
  env:             'QA',             // ← 'QA' or 'UAT'

  facility:        'BAL',
  buyerDivision:   'LPVCKNCBFMWOMEN',   //<------- Change
//   m3Style:         'CKF7549S41',CK444ADF46, CKF7323F4Z
  m3Style:         'CK444ADF46',    //<------- Change
  cpONumber:       'CPO_001_auto',
  vpoNumber:       'VPO_001_auto',
  leadFactory:     'B03',
  projectionCode:  'PC_auto_01',
  bom:             '001',
  buyType:         'Basic',
  buyerName:       'Auto_001',

  // Line Entry
  zFeature:        'PV0000000000020',
  //zFeature:        'PV0000000000021',PV0000000000020, PV0000000000005
  dateCode:        '26/05/15',      
  destination:     'australia',
  salesChannel:    'D00',
  otherZ:          'PV0000000000020',
  packMethod:      'c01',
//   expectedColor:   '100 101 IVORY',601 GEQ SYRAH, 600 XAT ROUGE
  expectedColor:   '600 XAT ROUGE',   //<------- Change
  sizeQty:         '100',


  // Add to orderData:
  schedulingFacility: 'BAL',
  skipDateSelection: false,

  // ── Run configuration ─────────────────────────────────────────
  runCount: 1,              // ← change this to run more times
  delayBetweenRuns: 7000, // ← 10 seconds between runs (ms)
};

module.exports = { orderData };