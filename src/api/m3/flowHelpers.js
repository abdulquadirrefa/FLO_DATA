// Helpers shared by the M3 data-creation API flows (fixed-style and generic).
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../../utils/paths');

const TEMPLATE_DIR = path.join(DATA_DIR, 'm3/graphql-templates');
const PO_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'pop-po-templates');

/** Fresh copy of a GraphQL request body from data/m3/graphql-templates/. */
function loadTemplate(fileName) {
  return JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, fileName), 'utf8'));
}

/** Fresh copy of a PO-creation sample body from data/m3/graphql-templates/pop-po-templates/. */
function loadPoTemplate(fileName) {
  return JSON.parse(fs.readFileSync(path.join(PO_TEMPLATE_DIR, fileName), 'utf8'));
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** 2026-01-31 */
function formatDateYMD(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 20260131 */
function formatDateCompact(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

// Mirrors RandomData.getFutureDate(years, months, days, ...) from the Java source.
function futureDate(years, months, days) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() + days);
  return d;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  loadTemplate,
  loadPoTemplate,
  formatDateYMD,
  formatDateCompact,
  futureDate,
  randomInt,
};
