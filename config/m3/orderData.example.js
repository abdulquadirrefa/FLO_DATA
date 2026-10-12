// ─────────────────────────────────────────────────────────────────────────────
// orderData.example.js — template for config/m3/orderData.js
//
// Copy this file to config/m3/orderData.js and edit it before each run:
//   PowerShell:  Copy-Item config/m3/orderData.example.js config/m3/orderData.js
//   bash:        cp config/m3/orderData.example.js config/m3/orderData.js
//
// orderData.js is gitignored — it holds your own per-run values and is never committed.
//
// `env` ('QA' | 'UAT') selects the URLs in config/urls.js and the matching
// credentials in .env for every M3 and GRN spec (UI and API). The remaining
// fields are only used by the M3 UI flows (npm run data / co-multi).
// Fields marked "← Change" are the ones you usually edit per run.
// ─────────────────────────────────────────────────────────────────────────────

const orderData = {
  env:             'UAT',               // ← 'QA' or 'UAT'

  // ── Customer Order header ───────────────────────────────────────
  facility:        'BAL',
  buyerDivision:   'LPVCKNCBFMWOMEN',   // ← Change — e.g. LLBCCQLBBFWOMEN | LPVCKNCBFMWOMEN | LPVCKNCBRMWOMEN
  m3Style:         'CKF7323F4Z',        // ← Change — e.g. CKF7549S4B, CKF7549S41, CKF7549S47, CK444ADF46, CKF7323F4P, CKF7323F4Y
  cpONumber:       'CPO_101_auto1',
  vpoNumber:       'VPO_101_auto1',
  leadFactory:     'B05',
  projectionCode:  'PC_auto_0101',
  bom:             '001',
  buyType:         'Basic',
  buyerName:       'Auto_001',

  // ── Line Entry ──────────────────────────────────────────────────
  zFeature:        'PV0000000000005',   // e.g. PV0000000000021, PV0000000000020, LB0000000000003
  dateCode:        '26/12/15',
  destination:     'australia',
  salesChannel:    'D00',
  otherZ:          'PV0000000000005',
  packMethod:      'c01',
  expectedColor:   ['100 101 IVORY', '001 UB1 BLACK'],   // ← Change — colour row(s) to fill, e.g. '601 GEQ SYRAH', '630 TQO SUBDUED'
  sizeQty:         '100',

  // ── Scheduling and Release ──────────────────────────────────────
  schedulingFacility: 'BAL',
  skipDateSelection:  false,

  // ── Run configuration ───────────────────────────────────────────
  runCount:         2,      // ← number of COs to create in one run
  delayBetweenRuns: 7000,   // ms between runs (7 seconds)
};

module.exports = { orderData };
