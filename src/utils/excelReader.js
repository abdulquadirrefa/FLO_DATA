const xlsx = require('xlsx');
const path = require('path');
const { DATA_DIR } = require('./paths');

/**
 * Reads the first column of the first sheet, skipping the header row and blank cells.
 * @param {string} filePath
 * @returns {string[]}
 */
function readFirstColumn(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  /** @type {any[][]} */
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  return rows
    .slice(1) // skip header row
    .map((row) => String(row[0]).trim())
    .filter((val) => val && val !== 'undefined');
}

/**
 * PO numbers for the GRN flows — data/grn/po-numbers.xlsx
 * @returns {string[]}
 */
function readPONumbers() {
  const poNumbers = readFirstColumn(path.join(DATA_DIR, 'grn/po-numbers.xlsx'));
  console.log(`📋 PO Numbers loaded: ${poNumbers.join(', ')}`);
  return poNumbers;
}

/**
 * Invoice numbers for Trims Inspection — data/flo/invoice-numbers.xlsx
 * @returns {string[]}
 */
function readInvoiceNumbers() {
  const invoices = readFirstColumn(path.join(DATA_DIR, 'flo/invoice-numbers.xlsx'));
  console.log(`📋 Invoice Numbers loaded: ${invoices.join(', ')}`);
  return invoices;
}

/**
 * Invoice numbers for Fabric Inspection — data/flo/fabric-invoice-numbers.xlsx
 * @returns {string[]}
 */
function readFabricInvoiceNumbers() {
  const invoices = readFirstColumn(path.join(DATA_DIR, 'flo/fabric-invoice-numbers.xlsx'));
  console.log(`📋 Fabric Invoice Numbers loaded: ${invoices.join(', ')}`);
  return invoices;
}

module.exports = { readFirstColumn, readPONumbers, readInvoiceNumbers, readFabricInvoiceNumbers };
