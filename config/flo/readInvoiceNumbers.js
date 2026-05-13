const xlsx = require('xlsx');
const path = require('path');

/**
 * Reads invoice numbers from the first column of invoice-numbers.xlsx
 * @returns {string[]}
 */
function readInvoiceNumbers() {
  const filePath = path.join(__dirname, '../../data/flo/invoice-numbers.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  /** @type {any[][]} */
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const invoices = rows
    .slice(1) // skip header row
    .map((row) => String(row[0]).trim())
    .filter((val) => val && val !== 'undefined');

  console.log(`📋 Invoice Numbers loaded: ${invoices.join(', ')}`);
  return invoices;
}

module.exports = { readInvoiceNumbers };
