const xlsx = require('xlsx');
const path = require('path');
const { DATA_DIR } = require('./paths');

const FILE_PATH = path.join(DATA_DIR, 'm3/created-data.xlsx');
const HEADER = ['CO Number', 'Schedule Number', 'Item Type', 'Procurement Group', 'PO Number', 'GRN Status'];

/**
 * Writes one row per created PO into data/m3/created-data.xlsx.
 * Mirrors the Java script's own CreatedData.xlsx output (coNumber/style/
 * scheduleNumber/itemType/procumentGroupSet/poNumber records), plus the GRN result.
 * @param {{coNumber: string, scheduleNumber: string, itemType: string, procurementGroup: string, poNumber: string, grnStatus?: string}[]} rows
 */
function writeCreatedData(rows) {
  const aoa = [
    HEADER,
    ...rows.map((r) => [r.coNumber, r.scheduleNumber, r.itemType, r.procurementGroup, r.poNumber, r.grnStatus ?? '']),
  ];

  const sheet = xlsx.utils.aoa_to_sheet(aoa);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, 'CreatedData');
  xlsx.writeFile(workbook, FILE_PATH);

  console.log(`Created data written to ${FILE_PATH}`);
}

/**
 * Reads the rows back from data/m3/created-data.xlsx (empty if the file doesn't exist).
 * @returns {{coNumber: string, scheduleNumber: string, itemType: string, procurementGroup: string, poNumber: string, grnStatus: string}[]}
 */
function readCreatedData() {
  let workbook;
  try {
    workbook = xlsx.readFile(FILE_PATH);
  } catch {
    return [];
  }
  /** @type {any[][]} */
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  return rows
    .slice(1)
    .filter((r) => r[4] !== undefined && String(r[4]).trim())
    .map((r) => ({
      coNumber: String(r[0] ?? ''),
      scheduleNumber: String(r[1] ?? ''),
      itemType: String(r[2] ?? ''),
      procurementGroup: String(r[3] ?? ''),
      poNumber: String(r[4]).trim(),
      grnStatus: String(r[5] ?? ''),
    }));
}

module.exports = { writeCreatedData, readCreatedData };
