// Stores results across all runs
const results = [];

function addResult(runNumber, coNumber, scheduleNumber, style) {
  results.push({
    runNumber,
    coNumber,
    scheduleNumber,
    style,
    timestamp: new Date().toISOString(),
  });
}

function printSummary() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════');
  console.log('           DATA CREATION SUMMARY               ');
  console.log('═══════════════════════════════════════════════');
  results.forEach(r => {
    console.log(`Run ${r.runNumber}:`);
    console.log(`  Style        : ${r.style}`);
    console.log(`  CO Number    : ${r.coNumber}`);
    console.log(`  Schedule No  : ${r.scheduleNumber}`);
    console.log(`  Completed at : ${r.timestamp}`);
    console.log('───────────────────────────────────────────────');
  });
  console.log(`Total runs completed: ${results.length}`);
  console.log('═══════════════════════════════════════════════\n');
}

function getResults() {
  return results;
}

module.exports = { addResult, printSummary, getResults };