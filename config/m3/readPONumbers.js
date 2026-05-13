const xlsx = require('xlsx');
const path = require('path');

/**
 * Reads PO numbers from the first column of po-numbers.xlsx
 * @returns {string[]}
 */
function readPONumbers() {
  const filePath = path.join(__dirname, '../../data/m3/po-numbers.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  /** @type {any[][]} */
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const poNumbers = rows
    .slice(1) // skip header row
    .map((row) => String(row[0]).trim())
    .filter((val) => val && val !== 'undefined');

  console.log(`📋 PO Numbers loaded: ${poNumbers.join(', ')}`);
  return poNumbers;
}

module.exports = { readPONumbers };
