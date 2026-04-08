/** @type {{ poNumber: string, grnEntryNumber: string, scanBarcode: string }[]} */
const collectedData = [];

/**
 * @param {string} poNumber
 * @param {string} grnEntryNumber
 * @param {string} scanBarcode
 */
function addResult(poNumber, grnEntryNumber, scanBarcode) {
  collectedData.push({ poNumber, grnEntryNumber, scanBarcode });
}

function printSummary() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📋 COLLECTED INVENTORY DATA SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  for (const entry of collectedData) {
    console.log(`  PO Number      : ${entry.poNumber}`);
    console.log(`  GRN Entry No.  : ${entry.grnEntryNumber}`);
    console.log(`  Scan Barcode   : ${entry.scanBarcode}`);
    console.log('  ─────────────────────────────────────────────────────');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

/** @returns {{ poNumber: string, grnEntryNumber: string, scanBarcode: string }[]} */
function getCollectedData() {
  return collectedData;
}

module.exports = { addResult, printSummary, getCollectedData };