// Settings for the API GRN flow (src/api/grn/grnApiFlow.js) — PL creation → Mark as
// In-House → scan → Confirm GRN (Update M3), done through the GRN app's backend APIs.
// Login comes from GRN_USERNAME / GRN_PASSWORD in .env.
const grnCfg = {
  warehouse: 'B03',

  // Where the "scan" puts the rolls — same values the device sends (and pl-split-grn's scanApi uses).
  // The app shows this location as LOC-100262 afterwards.
  locationId:   '100262',
  locationName: 'B03',

  // One packing list line per PO line (no split): BN001 / SP001, BN002 / SP002, …
  batchPrefix:       'BN',
  supplierPkgPrefix: 'SP',

  // How long to wait for each server-side step, checking every pollInterval
  pollInterval:      15000,
  poTimeout:         300000,   // a just-approved PO shows up in the GRN app
  plTimeout:         120000,   // new PL shows up in PL Overview
  inventoryTimeout:  600000,   // barcodes show up in Inventory View after Mark as In-House
  scanRetries:       12,       // a fresh barcode can fail the scan (LOCATION_ERROR) for a short while —
  scanRetryWait:     5000,     // …retry the failed ones up to 12× every 5s
  pendingGrnTimeout: 1200000,  // rows show up as Pending in Confirm GRN after the scan
  receiptTimeout:    1800000,  // M3 shows the PO as received after Update M3

  // When a call fails because of the server (5xx / timeout / dropped connection), try it again —
  // only for calls that can't create anything twice (lookups, scan, Mark as In-House after checking
  // it didn't already go through, Update M3 when the server rejected it). PL upload / submit are not retried.
  retryAttempts:     3,
  retryWait:         10000,
  failedRowRetries:  2,        // rows that land in Confirm GRN's Failed tab get "Retry" up to 2×
};

module.exports = { grnCfg };
