// Settings for the PL line-split GRN flow (tests/grn/pl-split-grn.spec.js)
const plSplitData = {
  splitCount:        250,     // Final number of lines EACH item line is split into (copy count entered = splitCount - 1)
  batchPrefix:       'BN',   // Batch No        → BN001-01 … BN001-10, BN002-01 …
  supplierPkgPrefix: 'SP',   // Supplier Pkg ID → SP001-01 … SP001-10, SP002-01 …

  // true  → PL Overview: select all lines, PRINT a Consolidated Barcode, then Mark as In-House;
  //         Inventory gives ONE barcode + GRN for all lines, scanned once on the device.
  // false → one barcode per line, every line scanned on the device.
  consolidatedBarcode: false,

  // How the inventory barcodes get "scanned" after Mark as In-House:
  //   'api'    → per PO: read all barcodes from Inventory View → location-update API → Confirm GRN → next PO
  //   'device' → scan every barcode on the mobile device page, then Confirm GRN for all POs
  scanVia:             'api',
  scanApi: {
    url:          'https://grn-inventory.flo.uat.brandixlk.org/raw-material-inventory/location-update',
    locationId:   '100262',
    locationName: 'B03',
    warehouseId:  'B03',
    batchSize:    500,      // barcodes per API call
    timeout:      300000,   // ms per API call
  },

  // TEMPORARY — where to stop the run:
  //   'pl'      → after PL creation + split (no PL Overview / print / Mark as In-House)
  //   'inhouse' → after Mark as In-House (no Inventory, scan or Confirm GRN)
  //   ''        → full flow
  stopAfter:           '',

  printTimeout:        600000,   // Wait for the consolidated barcode file to download after Print → Confirm (saved to downloads/consolidated-barcodes)
  scanSuccessTimeout:  1800000,  // Wait for the device's success message after scanning the consolidated barcode
  consolidatedWaitTimeout: 900000,  // Inventory: keep searching up to 15 min until every barcode on page 1 is the same
  consolidatedRetryWait:   15000,   // …searching again every 15s

  // Timeouts for the slower steps — more lines means longer server processing
  saveSubmitTimeout:  300000,  // Wait for "File uploaded Successfully" after Submit
  markInHouseTimeout: 300000,  // Wait for "Mark as Pending" after Mark as In-House
  inventoryRetries:   6,       // Re-search Inventory View until all split lines appear
  inventoryRetryWait: 10000,
  updateM3Wait:       30000,   // Wait after Update M3 (all pages are updated in one go)
  completedTimeout:       1800000, // Confirm GRN: keep reloading the Completed tab up to 30 min until every split line shows
  completedCheckInterval: 5000,    // …reloading every 5s
};

module.exports = { plSplitData };
