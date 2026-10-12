const xlsx = require('xlsx');
const path = require('path');
const { DATA_DIR } = require('./paths');

/**
 * Separate from writeCreatedData.js on purpose — writes to its own file so
 * generic runs never clobber the fixed-style script's output.
 * @param {{coNumber: string, scheduleNumber: string, itemType: string, procurementGroup: string, poNumber: string}[]} rows
 * @param {string} style used to name the output file, e.g. created-data-CKF7323F4Z.xlsx
 */
function writeCreatedDataGeneric(rows, style) {
  const fileName = `created-data-${style}.xlsx`;
  const filePath = path.join(DATA_DIR, 'm3', fileName);

  const header = ['CO Number', 'Schedule Number', 'Item Type', 'Procurement Group', 'PO Number'];
  const aoa = [
    header,
    ...rows.map((r) => [r.coNumber, r.scheduleNumber, r.itemType, r.procurementGroup, r.poNumber]),
  ];

  const sheet = xlsx.utils.aoa_to_sheet(aoa);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, 'CreatedData');
  xlsx.writeFile(workbook, filePath);

  console.log(`Created data written to ${filePath}`);
}

module.exports = { writeCreatedDataGeneric };
