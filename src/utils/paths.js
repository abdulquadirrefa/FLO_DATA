// Absolute paths to the project's top-level folders, so modules don't depend on
// how deep they sit in the tree (no fragile '../../../data' chains).
const path = require('path');

const ROOT_DIR      = path.resolve(__dirname, '../..');
const DATA_DIR      = path.join(ROOT_DIR, 'data');
const DOWNLOADS_DIR = path.join(ROOT_DIR, 'downloads');
const AUTH_DIR      = path.join(ROOT_DIR, 'playwright/.auth');

module.exports = { ROOT_DIR, DATA_DIR, DOWNLOADS_DIR, AUTH_DIR };
