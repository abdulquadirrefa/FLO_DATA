// ── Default values used when filling the Fabric Inspection batch form ──
// Change these if the test data requirements change.
const fabricInspectionData = {
  category:      'One Way',              // Category combobox value
  defect:        'Bowing',              // Defect type combobox value
  detailValue:   '1',                   // Numeric inputs in the detail rows
  shadeGroup:    'AA',                  // Shade group code
  fillValue:     '1',                   // Quantity fill value for all Fill buttons
  remark:        'Auto - Fabric Inspect', // Remarks textarea
  finalQuantity: '1',                   // Approved / other quantity fields after Yes
};

module.exports = { fabricInspectionData };