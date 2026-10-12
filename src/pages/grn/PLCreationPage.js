const { buildLocators } = require('../../locators/grn/PLCreationLocators');

class PLCreationPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  async navigateToPLCreation() {
    await this.navLink.click();
    await this.page.waitForTimeout(2000);
    console.log('✅ Navigated to PL Creation');
  }

  /** @param {string} poNumber */
  async enterPONumber(poNumber) {
    await this.poInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.poInput.click();
    await this.poInput.fill(poNumber);
    await this.page.waitForTimeout(500);
    console.log(`  → PO number entered: ${poNumber}`);
  }

  async clickNext() {
    await this.nextBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Next');
  }

  async clickCreatePackingList() {
    await this.createPackingListBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Create Packing List');
  }

  /** @param {string} poNumber */
  async fillPackingListForm(poNumber) {
    await this.packingListNoInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.packingListNoInput.fill(poNumber);
    await this.invoiceNoInput.fill(poNumber);
    await this.cusdecNoInput.fill(poNumber);
    console.log('  → Packing List form filled');
  }

  async clickAutoPopulateOrderQuantity() {
    await this.autoPopulateBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.autoPopulateBtn.scrollIntoViewIfNeeded();
    await this.autoPopulateBtn.click();
    await this.page.waitForTimeout(1000);
    console.log('  → Clicked Auto Populate Order Quantity');
  }

  async confirmAlertYes() {
    await this.confirmYesBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.confirmYesBtn.click();
    console.log('  → Confirmed Yes on alert');
  }

  async fillSpreadsheetColumns() {
    await this.drawer.waitFor({ state: 'visible', timeout: 15000 });

    const spreadsheet = this.drawer.locator('.Spreadsheet__table').first();
    await spreadsheet.waitFor({ state: 'visible', timeout: 15000 });

    const headers = this.drawer.locator('.Spreadsheet__table tbody tr:first-child th.Spreadsheet__header');
    const headerCount = await headers.count();

    let batchNoColIndex = -1;
    let supplierPackageIDColIndex = -1;

    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).innerText();
      if (text.trim() === 'Batch No') batchNoColIndex = i;
      if (text.trim() === 'Supplier Package ID') supplierPackageIDColIndex = i;
    }

    console.log(`  → Batch No col: ${batchNoColIndex}, Supplier Package ID col: ${supplierPackageIDColIndex}`);

    const rows = this.drawer.locator('.Spreadsheet__table tbody tr[row]');
    const rowCount = await rows.count();
    console.log(`  → ${rowCount} actual data row(s) found`);

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const batchValue    = `BN_${String(rowIdx + 1).padStart(3, '0')}`;
      const supplierValue = `SP_${String(rowIdx + 1).padStart(3, '0')}`;

      const batchCell = rows.nth(rowIdx).locator('td.Spreadsheet__cell:not(.Spreadsheet__cell--readonly)').nth(0);
      await batchCell.scrollIntoViewIfNeeded();
      await batchCell.dblclick();
      await this.page.waitForTimeout(300);
      await this.page.keyboard.type(batchValue);
      console.log(`    Row ${rowIdx + 1}: Batch=${batchValue} typed`);

      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(300);
      await this.page.keyboard.type(supplierValue);
      console.log(`    Row ${rowIdx + 1}: SupplierPkg=${supplierValue} typed`);

      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(300);
    }
  }

  async clickSave() {
    await this.saveBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Save');
  }

  async clickSaveChanges() {
    await this.saveChangesBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Save Changes');
  }

  async clickSubmit() {
    await this.submitBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('  → Clicked Submit');
  }

  /** @param {number} [timeout] */
  async waitForSuccessMessage(timeout = 20000) {
    await this.successMessage.waitFor({ state: 'visible', timeout });
    console.log('  ✅ Upload successful!');
  }

  async clickUploadAnotherPackingList() {
    await this.uploadAnotherBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Upload Another Packing List');
  }

  // ── Line split (pl-split-grn flow) ──────────────────────────────

  /**
   * Splits every item line into `splitCount` lines (select row → copy → remove extras),
   * divides the quantity across them and gives each line a unique Batch No / Supplier Package ID.
   * Item k's block always sits at rows [k*splitCount, k*splitCount + splitCount), because
   * copies are inserted directly below the selected row.
   * @param {{ splitCount: number, batchPrefix: string, supplierPkgPrefix: string }} opts
   * @returns {Promise<SplitItem[]>}
   */
  async splitAllItemLines({ splitCount, batchPrefix, supplierPkgPrefix }) {
    if (splitCount < 1 || splitCount > 1001) throw new Error(`splitCount must be 1–1001 (got ${splitCount})`);

    await this.drawer.waitFor({ state: 'visible', timeout: 15000 });
    await this.spreadsheetRows.first().waitFor({ state: 'visible', timeout: 30000 });

    const cols        = await this.getSpreadsheetColumns();
    const initialRows = await this.readSpreadsheetRows(cols);

    /** @type {SplitItem[]} */
    const items = initialRows.map((row, i) => {
      if (row.quantity === null) {
        throw new Error(`Row ${i + 1} (${row.itemCode}) has no Quantity after Auto Populate — cannot split`);
      }
      return { itemNo: i + 1, itemCode: row.itemCode, originalQty: row.quantity, lines: [] };
    });

    console.log(`  → ${items.length} item line(s) found — each will be split into ${splitCount} line(s)`);
    items.forEach(it => console.log(`     Item ${it.itemNo}: ${it.itemCode} | Qty ${it.originalQty}`));

    // Splitting never changes the total quantity, so these must read the same again after every block
    const totals = await this.readTotals();
    console.log(`  → Totals after Auto Populate — Sub Total ${totals.subTotal} | ` +
                `Balance W.O.T ${totals.balanceWOT} | Balance W.T ${totals.balanceWT}`);

    for (let k = 0; k < items.length; k++) {
      const item       = items[k];
      const blockStart = k * splitCount;
      const itemsAfter = items.length - k - 1;

      console.log(`\n  ── Item ${item.itemNo}/${items.length}: ${item.itemCode} (Qty ${item.originalQty}) ──`);

      if (splitCount > 1) {
        await this.copyRow(blockStart, splitCount - 1);
      }
      await this.normaliseItemBlock(cols, item, blockStart, itemsAfter, splitCount);
      await this.fillItemBlock(cols, item, blockStart, splitCount, batchPrefix, supplierPkgPrefix, totals);
    }

    await this.verifySplitResult(cols, items, splitCount);
    return items;
  }

  /** Column indices, aligned with each row's children (row-number th + data tds). */
  async getSpreadsheetColumns() {
    const headers = (await this.spreadsheetHeaders.allTextContents()).map(t => t.trim());
    const find    = name => headers.indexOf(name);

    const cols = {
      itemCode:      find('Item Code'),
      batchNo:       find('Batch No'),
      supplierPkgId: find('Supplier Package ID'),
      quantity:      find('Quantity'),
    };

    const missing = Object.entries(cols).filter(([, idx]) => idx < 0).map(([key]) => key);
    if (missing.length) throw new Error(`Spreadsheet column(s) not found: ${missing.join(', ')}`);

    console.log(`  → Columns — Item Code: ${cols.itemCode}, Batch No: ${cols.batchNo}, ` +
                `Supplier Package ID: ${cols.supplierPkgId}, Quantity: ${cols.quantity}`);
    return cols;
  }

  /**
   * Reads the whole spreadsheet in one round-trip.
   * @param {SpreadsheetColumns} cols
   * @returns {Promise<SpreadsheetRow[]>}
   */
  async readSpreadsheetRows(cols) {
    const raw = await this.spreadsheetRows.evaluateAll(trs =>
      trs.map(tr => Array.from(tr.children).map(c => (c.textContent || '').trim()))
    );

    return raw.map((cells, index) => ({
      index,
      itemCode:      cells[cols.itemCode]      ?? '',
      batchNo:       cells[cols.batchNo]       ?? '',
      supplierPkgId: cells[cols.supplierPkgId] ?? '',
      quantity:      parseQuantity(cells[cols.quantity] ?? ''),
    }));
  }

  /**
   * Clicking any cell selects its row ("Selected Row : N"); the row-number header does not.
   * @param {number} rowIndex 0-based data row
   */
  async selectRow(rowIndex) {
    const firstCell = this.spreadsheetRows.nth(rowIndex).locator(':scope > td').first();   // Style Attribute (read-only)
    let label = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      await firstCell.scrollIntoViewIfNeeded();
      await firstCell.click({ force: true });   // the active-cell overlay may sit on top of this cell — see setCellValue
      await this.page.waitForTimeout(400);

      label = ((await this.rowSelectionLabel.textContent({ timeout: 3000 }).catch(() => '')) || '').trim();
      if (new RegExp(`Selected Row\\s*:\\s*${rowIndex + 1}$`, 'i').test(label)) return;

      console.log(`    ⚠️ Row ${rowIndex + 1} not selected yet (label: "${label}") — retrying`);
    }
    throw new Error(`Could not select row ${rowIndex + 1} (label: "${label}")`);
  }

  /**
   * @param {number} rowIndex
   * @param {number} copies value entered in the copy-count box
   */
  async copyRow(rowIndex, copies) {
    await this.copyCountInput.scrollIntoViewIfNeeded();
    await this.copyCountInput.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.type(String(copies));
    await this.page.waitForTimeout(300);

    const entered = await this.copyCountInput.inputValue();
    if (entered !== String(copies)) throw new Error(`Copy count box shows "${entered}", expected "${copies}"`);

    await this.selectRow(rowIndex);

    const before = await this.spreadsheetRows.count();
    await this.copyRowBtn.click();
    const after = await this.waitForRowCountChange(before, 90000);
    console.log(`    📋 Copied row ${rowIndex + 1} × ${copies} — rows ${before} → ${after}`);
  }

  /** @param {number} rowIndex */
  async deleteRow(rowIndex) {
    await this.selectRow(rowIndex);

    const before = await this.spreadsheetRows.count();
    await this.deleteRowBtn.click();
    const after = await this.waitForRowCountChange(before, 30000);
    console.log(`    🗑️ Deleted row ${rowIndex + 1} — rows ${before} → ${after}`);
  }

  /**
   * Waits for the row count to change from `before`, then for it to settle.
   * @param {number} before
   * @param {number} timeout
   * @returns {Promise<number>} the settled row count
   */
  async waitForRowCountChange(before, timeout) {
    const deadline = Date.now() + timeout;
    let count = before;

    while (count === before) {
      if (Date.now() > deadline) throw new Error(`Row count stayed at ${before} for ${timeout / 1000}s`);
      await this.page.waitForTimeout(500);
      count = await this.spreadsheetRows.count();
    }

    // Large copies may render in batches — wait until the count is stable
    let stable = 0;
    while (stable < 2 && Date.now() < deadline) {
      await this.page.waitForTimeout(750);
      const next = await this.spreadsheetRows.count();
      stable = next === count ? stable + 1 : 0;
      count  = next;
    }
    return count;
  }

  /**
   * Deletes blank rows and extra copies (or tops up missing ones) until the item's
   * block has exactly `splitCount` rows.
   * @param {SpreadsheetColumns} cols
   * @param {SplitItem} item
   * @param {number} blockStart
   * @param {number} itemsAfter unprocessed item lines below this block
   * @param {number} splitCount
   */
  async normaliseItemBlock(cols, item, blockStart, itemsAfter, splitCount) {
    for (let attempt = 1; attempt <= 6; attempt++) {
      const rows = await this.readSpreadsheetRows(cols);

      const blankRows = rows.filter(r => r.quantity === null);
      const badBlank  = blankRows.find(r => r.index < blockStart);
      if (badBlank) throw new Error(`Row ${badBlank.index + 1} of an already-split item has no Quantity`);

      if (blankRows.length) {
        console.log(`    → ${blankRows.length} blank row(s) found — deleting`);
        for (const r of [...blankRows].reverse()) await this.deleteRow(r.index);   // bottom-up keeps indices valid
        continue;
      }

      const blockLen = rows.length - blockStart - itemsAfter;

      if (blockLen > splitCount) {
        console.log(`    → ${blockLen} line(s) for this item, need ${splitCount} — deleting ${blockLen - splitCount} extra`);
        for (let idx = blockStart + blockLen - 1; idx >= blockStart + splitCount; idx--) await this.deleteRow(idx);
        continue;
      }

      if (blockLen < splitCount) {
        console.log(`    → Only ${blockLen} line(s) for this item, need ${splitCount} — copying ${splitCount - blockLen} more`);
        await this.copyRow(blockStart, splitCount - blockLen);
        continue;
      }

      const wrong = rows.slice(blockStart, blockStart + splitCount).find(r => r.itemCode !== item.itemCode);
      if (wrong) {
        throw new Error(`Row ${wrong.index + 1} has Item Code "${wrong.itemCode}" but expected "${item.itemCode}" — ` +
                        'copied rows were not inserted below the selected row');
      }

      console.log(`    ✅ Item ${item.itemNo} has exactly ${splitCount} line(s) (rows ${blockStart + 1}–${blockStart + splitCount})`);
      return;
    }
    throw new Error(`Could not get exactly ${splitCount} line(s) for item ${item.itemCode}`);
  }

  /**
   * Writes Batch No, Supplier Package ID and the split quantity on each line of the item's block.
   * @param {SpreadsheetColumns} cols
   * @param {SplitItem} item
   * @param {number} blockStart
   * @param {number} splitCount
   * @param {string} batchPrefix
   * @param {string} supplierPkgPrefix
   * @param {Totals} expectedTotals Sub Total / balance fields as shown straight after Auto Populate
   */
  async fillItemBlock(cols, item, blockStart, splitCount, batchPrefix, supplierPkgPrefix, expectedTotals) {
    const quantities = splitQuantity(item.originalQty, splitCount);
    const itemTag    = String(item.itemNo).padStart(3, '0');
    const lineWidth  = Math.max(2, String(splitCount).length);

    item.lines = quantities.map((quantity, j) => {
      const lineTag = String(j + 1).padStart(lineWidth, '0');
      return {
        rowIndex:      blockStart + j,
        batchNo:       `${batchPrefix}${itemTag}-${lineTag}`,
        supplierPkgId: `${supplierPkgPrefix}${itemTag}-${lineTag}`,
        quantity,
      };
    });

    console.log(`    → Qty ${item.originalQty} ÷ ${splitCount} = ${quantities[0]}` +
                (quantities[0] !== quantities[splitCount - 1] ? ` (last line ${quantities[splitCount - 1]})` : ''));

    const started = Date.now();
    let method    = 'pasted';

    if (!(await this.pasteLines(cols, item.lines))) {
      method = 'typed';
      console.log('    → Paste not picked up — typing values cell by cell');
      for (const line of item.lines) await this.writeLine(cols, line);
    }
    await this.ensureLinesWritten(cols, item);

    // The totals are calculated from the app's own state, so they only return to their Auto Populate
    // values once the app has registered the new quantities (not just the spreadsheet display).
    // Compared as displayed — Sub Total is shown rounded to a whole number (90.20 → "90.00").
    if (!(await this.totalsMatch(expectedTotals)) && method === 'pasted') {
      method = 'typed';
      console.log('    ⚠️ Totals did not update after paste — typing values cell by cell');
      for (const line of item.lines) await this.writeLine(cols, line);
      await this.ensureLinesWritten(cols, item);
    }
    if (!(await this.totalsMatch(expectedTotals))) {
      const shown = await this.readTotals();
      throw new Error(`Totals after splitting ${item.itemCode} — Sub Total ${shown.subTotal}, Balance W.O.T ${shown.balanceWOT}, ` +
                      `Balance W.T ${shown.balanceWT}; expected ${expectedTotals.subTotal}, ${expectedTotals.balanceWOT}, ` +
                      `${expectedTotals.balanceWT} (as after Auto Populate)`);
    }

    for (const line of item.lines) {
      console.log(`    Row ${line.rowIndex + 1}: BN=${line.batchNo} | SP=${line.supplierPkgId} | Qty=${line.quantity}`);
    }
    console.log(`    ✅ Item ${item.itemNo} lines updated (${method} in ${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }

  /**
   * Pastes the whole block (BN ⇥ SP ⇥ Qty per line) into the spreadsheet in one go, starting at the
   * first line's Batch No cell. Needs the three columns to be adjacent and in that order.
   * @param {SpreadsheetColumns} cols
   * @param {SplitLine[]} lines
   * @returns {Promise<boolean>} true when every pasted value shows in the table
   */
  async pasteLines(cols, lines) {
    if (cols.supplierPkgId !== cols.batchNo + 1 || cols.quantity !== cols.batchNo + 2) return false;

    const firstRow = this.spreadsheetRows.nth(lines[0].rowIndex);
    const anchor   = firstRow.locator(':scope > th, :scope > td').nth(cols.batchNo);

    // Activate the read-only first cell, then the anchor — guarantees the anchor is active in view mode
    // (clicking an already-active cell would open its editor instead)
    await firstRow.locator(':scope > td').first().click({ force: true });
    await anchor.scrollIntoViewIfNeeded();
    await anchor.click({ force: true });

    const tsv = lines.map(l => [l.batchNo, l.supplierPkgId, l.quantity].join('\t')).join('\n');
    await this.page.evaluate(text => {
      const data = new DataTransfer();
      data.setData('text/plain', text);
      (document.activeElement || document).dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
      );
    }, tsv);
    await this.page.waitForTimeout(300);

    const rows = await this.readSpreadsheetRows(cols);
    return lines.every(line => lineMatches(rows[line.rowIndex], line));
  }

  /**
   * Re-checks the block and rewrites any line that did not commit.
   * @param {SpreadsheetColumns} cols
   * @param {SplitItem} item
   */
  async ensureLinesWritten(cols, item) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const rows       = await this.readSpreadsheetRows(cols);
      const mismatched = item.lines.filter(line => !lineMatches(rows[line.rowIndex], line));
      if (!mismatched.length) return;

      if (attempt === 3) {
        const bad = mismatched[0];
        const row = rows[bad.rowIndex];
        throw new Error(`Row ${bad.rowIndex + 1} shows BN=${row?.batchNo} SP=${row?.supplierPkgId} Qty=${row?.quantity}, ` +
                        `expected BN=${bad.batchNo} SP=${bad.supplierPkgId} Qty=${bad.quantity}`);
      }
      console.log(`    ⚠️ ${mismatched.length} line(s) did not save correctly — rewriting`);
      for (const line of mismatched) await this.writeLine(cols, line);
    }
  }

  /** @returns {Promise<Totals>} the summary fields exactly as displayed */
  async readTotals() {
    const read = locator => locator.inputValue({ timeout: 3000 }).catch(() => 'n/a');
    return {
      subTotal:   await read(this.subTotalInput),
      balanceWOT: await read(this.balanceWOTInput),
      balanceWT:  await read(this.balanceWTInput),
    };
  }

  /**
   * Polls until the summary fields show exactly the expected values.
   * @param {Totals} expected
   */
  async totalsMatch(expected) {
    for (let i = 0; i < 10; i++) {
      const shown = await this.readTotals();
      if (shown.subTotal === expected.subTotal && shown.balanceWOT === expected.balanceWOT &&
          shown.balanceWT === expected.balanceWT) return true;
      await this.page.waitForTimeout(300);
    }
    return false;
  }

  /**
   * @param {SpreadsheetColumns} cols
   * @param {SplitLine} line
   */
  async writeLine(cols, line) {
    await this.setCellValue(line.rowIndex, cols.batchNo,       line.batchNo);
    await this.setCellValue(line.rowIndex, cols.supplierPkgId, line.supplierPkgId);
    await this.setCellValue(line.rowIndex, cols.quantity,      line.quantity);
  }

  /**
   * Double-clicks a cell into edit mode, replaces its value and commits with Tab.
   * @param {number} rowIndex
   * @param {number} colIndex
   * @param {string} value
   */
  async setCellValue(rowIndex, colIndex, value) {
    const cell = this.spreadsheetRows.nth(rowIndex).locator(':scope > th, :scope > td').nth(colIndex);

    await cell.scrollIntoViewIfNeeded();
    // After Tab, the spreadsheet's active-cell overlay covers this cell and Playwright's actionability
    // check would retry forever ("intercepts pointer events"). Forcing clicks through to that same overlay.
    await cell.dblclick({ force: true });

    if (!(await this.isCellEditing())) {
      await this.page.keyboard.press('Enter');
      if (!(await this.isCellEditing())) {
        throw new Error(`Row ${rowIndex + 1}, column ${colIndex} did not enter edit mode`);
      }
    }

    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.insertText(value);   // one input event instead of a keystroke per character
    await this.page.keyboard.press('Tab');
  }

  async isCellEditing() {
    return this.cellEditor.waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false);
  }

  /**
   * Final check: N × splitCount rows, each block sums to the original quantity, BN/SP unique.
   * @param {SpreadsheetColumns} cols
   * @param {SplitItem[]} items
   * @param {number} splitCount
   */
  async verifySplitResult(cols, items, splitCount) {
    const rows     = await this.readSpreadsheetRows(cols);
    const expected = items.length * splitCount;
    const errors   = [];

    if (rows.length !== expected) errors.push(`expected ${expected} row(s), found ${rows.length}`);

    for (const item of items) {
      const block = rows.slice((item.itemNo - 1) * splitCount, item.itemNo * splitCount);
      const sum   = block.reduce((acc, r) => acc + Math.round((r.quantity ?? 0) * 100), 0);
      if (sum !== Math.round(item.originalQty * 100)) {
        errors.push(`item ${item.itemCode} lines total ${(sum / 100).toFixed(2)}, expected ${item.originalQty}`);
      }
      if (block.some(r => r.itemCode !== item.itemCode)) errors.push(`item ${item.itemCode} block contains other items`);
    }

    const dupes = values => values.filter((v, i) => values.indexOf(v) !== i);
    const dupBN = dupes(rows.map(r => r.batchNo));
    const dupSP = dupes(rows.map(r => r.supplierPkgId));
    if (dupBN.length) errors.push(`duplicate Batch No: ${[...new Set(dupBN)].join(', ')}`);
    if (dupSP.length) errors.push(`duplicate Supplier Package ID: ${[...new Set(dupSP)].join(', ')}`);

    if (errors.length) throw new Error(`❌ Line split verification failed — ${errors.join('; ')}`);

    const subTotal = await this.subTotalInput.inputValue({ timeout: 3000 }).catch(() => 'n/a');
    const qtyTotal = items.reduce((acc, it) => acc + Math.round(it.originalQty * 100), 0) / 100;
    console.log(`\n  ✅ Split verified — ${rows.length} line(s), total qty ${qtyTotal.toFixed(2)} (Sub Total field: ${subTotal})`);
  }
}

/**
 * @typedef {{ itemCode: number, batchNo: number, supplierPkgId: number, quantity: number }} SpreadsheetColumns
 * @typedef {{ index: number, itemCode: string, batchNo: string, supplierPkgId: string, quantity: number|null }} SpreadsheetRow
 * @typedef {{ rowIndex: number, batchNo: string, supplierPkgId: string, quantity: string }} SplitLine
 * @typedef {{ itemNo: number, itemCode: string, originalQty: number, lines: SplitLine[] }} SplitItem
 * @typedef {{ subTotal: string, balanceWOT: string, balanceWT: string }} Totals
 */

/** @param {string} text e.g. "1,023.00" → 1023, "" → null */
function parseQuantity(text) {
  const value = parseFloat(text.replace(/,/g, ''));
  return Number.isNaN(value) ? null : value;
}

/**
 * Divides `total` into `parts` values rounded to 2 decimals; the last part takes the remainder
 * so the parts always sum to exactly `total` (e.g. 10 ÷ 3 → 3.33, 3.33, 3.34).
 * @param {number} total
 * @param {number} parts
 * @returns {string[]}
 */
function splitQuantity(total, parts) {
  const totalCents = Math.round(total * 100);
  if (totalCents < parts) {
    throw new Error(`Quantity ${total} is too small to split into ${parts} line(s) — each line needs at least 0.01`);
  }

  let each = Math.round(totalCents / parts);
  if (totalCents - each * (parts - 1) <= 0) each = Math.floor(totalCents / parts);   // rounding up overshot (tiny qty)
  const last = totalCents - each * (parts - 1);

  return [...Array(parts - 1).fill(each), last].map(cents => (cents / 100).toFixed(2));
}

/**
 * @param {SpreadsheetRow|undefined} row
 * @param {SplitLine} line
 */
function lineMatches(row, line) {
  return !!row &&
    row.batchNo === line.batchNo &&
    row.supplierPkgId === line.supplierPkgId &&
    row.quantity !== null &&
    Math.round(row.quantity * 100) === Math.round(parseFloat(line.quantity) * 100);
}

module.exports = { PLCreationPage };
