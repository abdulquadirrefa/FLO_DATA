const { buildLocators } = require('../../locators/grn/ConfirmGRNLocators');

class ConfirmGRNPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    Object.assign(this, buildLocators(page));
  }

  async navigate() {
    await this.deliverySubmenu.click();
    await this.page.waitForTimeout(1000);

    await this.confirmGRNLink.click();
    await this.page.waitForTimeout(2000);
    console.log('✅ Navigated to Confirm GRN');
  }

  /** @param {string} poNumber */
  async enterPOAndClickNext(poNumber) {
    await this.poInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.poInput.click();
    await this.poInput.fill(poNumber);
    await this.page.waitForTimeout(500);

    await this.nextBtn.click();
    await this.page.waitForTimeout(2000);
    console.log(`  → PO ${poNumber} entered and Next clicked`);
  }

  async selectAndUpdateAllPages() {
    let pageNum = 1;

    while (true) {
      console.log(`  → Selecting rows on page ${pageNum}...`);

      await this.headerCheckbox.waitFor({ state: 'visible', timeout: 15000 });
      await this.headerCheckbox.click();
      await this.page.waitForTimeout(1000);

      const dialogVisible = await this.selectCurrentPageBtn.isVisible();
      if (dialogVisible) {
        await this.selectCurrentPageBtn.click();
        await this.page.waitForTimeout(1000);
        console.log(`  → Dialog appeared — clicked "Select Current Page" (page ${pageNum})`);
      }

      console.log(`  ✅ Page ${pageNum} rows selected`);

      await this.updateM3Btn.click();
      console.log(`  → Clicked Update M3 for page ${pageNum}, waiting 25 seconds...`);
      await this.page.waitForTimeout(25000);

      const hasPagination = await this.pagination.isVisible();
      if (!hasPagination) break;

      const nextDisabled = await this.nextPageBtn.getAttribute('aria-disabled');
      if (nextDisabled === 'true') break;

      await this.nextPageBtn.click();
      await this.page.waitForTimeout(2000);
      pageNum++;
    }

    console.log(`  → All pages processed (${pageNum} page(s))`);
  }

  /**
   * Selects every row across all pages in one go (header checkbox → Select All Pages → Yes),
   * then clicks Update M3 once.
   * @param {number} [updateWait] ms to wait after Update M3
   */
  async selectAllPagesAndUpdate(updateWait = 25000) {
    await this.headerCheckbox.waitFor({ state: 'visible', timeout: 15000 });
    await this.headerCheckbox.click();

    // The dialog only appears when the rows span more than one page — it can be slow while M3 is busy
    const hasDialog = await this.selectAllPagesBtn.waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false);
    if (hasDialog) {
      await this.selectAllPagesBtn.click();
      console.log('  → Dialog appeared — clicked "Select All Pages"');

      await this.confirmYesBtn.waitFor({ state: 'visible', timeout: 10000 });
      await this.confirmYesBtn.click();
      await this.page.waitForTimeout(1000);
      console.log('  → Confirmed Yes');
    } else {
      console.log('  → No dialog (single page) — all rows selected');
    }

    const enabled = await this.updateM3Btn.isEnabled({ timeout: 10000 }).catch(() => false);
    if (!enabled) throw new Error('Update M3 is disabled — rows not selected (still processing?)');

    await this.updateM3Btn.click();
    console.log(`  → Clicked Update M3, waiting ${updateWait / 1000} seconds...`);
    await this.page.waitForTimeout(updateWait);
  }

  async verifyCompletedTab() {
    let found = false;

    for (let attempt = 1; attempt <= 10; attempt++) {
      await this.completedTab.click();
      await this.page.waitForTimeout(2000);

      const count = await this.tableRows.count();

      if (count > 0) {
        console.log(`  ✅ Completed tab has ${count} row(s) — verification passed`);
        found = true;
        break;
      }

      console.log(`  ⚠️ Attempt ${attempt}: No rows in Completed tab, switching to Pending and retrying...`);

      await this.pendingTab.click();
      await this.page.waitForTimeout(3000);
    }

    if (!found) {
      throw new Error('❌ Completed tab verification failed — no rows found after retries');
    }
  }

  /**
   * Re-fetches the Completed tab with the table's reload button until it shows at least
   * `expectedRows` rows across all pages, or `timeout` runs out.
   * @param {number} expectedRows
   * @param {{ timeout?: number, interval?: number }} [opts] ms to keep trying / ms between refreshes
   */
  async waitForCompletedRows(expectedRows, { timeout = 300000, interval = 5000 } = {}) {
    await this.completedTab.click();
    await this.page.waitForTimeout(2000);

    const started  = Date.now();
    const deadline = started + timeout;
    const elapsed  = () => `${Math.round((Date.now() - started) / 1000)}s`;
    let count   = 0;
    let attempt = 0;

    while (true) {
      attempt++;
      await this.refreshTable();
      count = await this.countRowsAllPages();

      if (count >= expectedRows) {
        console.log(`  ✅ Completed tab has ${count}/${expectedRows} row(s) after ${elapsed()} — verification passed`);
        return;
      }
      if (Date.now() + interval > deadline) break;

      console.log(`  ⚠️ Check ${attempt} (${elapsed()}): Completed tab has ${count}/${expectedRows} row(s) — ` +
                  `refreshing again in ${interval / 1000}s...`);
      await this.page.waitForTimeout(interval);
    }

    throw new Error(`❌ Completed tab shows ${count}/${expectedRows} row(s) after ${elapsed()} ` +
                    `(limit ${timeout / 1000}s, ${attempt} refreshes)`);
  }

  /** Clicks the table's reload button (Search if it is not there) and waits for the fetch to finish. */
  async refreshTable() {
    const button = (await this.reloadBtn.isVisible()) ? this.reloadBtn : this.searchBtn;
    await button.click();
    await this.waitForTableLoaded();
  }

  async waitForTableLoaded() {
    await this.page.waitForTimeout(1000);
    await this.tableLoading.first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  }

  /**
   * Total rows in the current tab, loading only the first and last page
   * (every page but the last is full): (lastPage - 1) × rowsPerPage + rowsOnLastPage.
   */
  async countRowsAllPages() {
    if (!(await this.pagination.isVisible())) return this.tableRows.count();

    const firstPage = this.pagination.locator('li.ant-pagination-item-1');
    if (!(await firstPage.getAttribute('class') || '').includes('ant-pagination-item-active')) {
      await firstPage.click();
      await this.waitForTableLoaded();
    }
    const perPage = await this.tableRows.count();

    const lastItem  = this.pagination.locator('li.ant-pagination-item').last();
    const lastClass = (await lastItem.getAttribute('class')) || '';
    const lastPage  = Number((await lastItem.getAttribute('title')) || lastClass.match(/ant-pagination-item-(\d+)/)?.[1]);
    if (!lastPage || lastPage <= 1) return perPage;

    await lastItem.click();
    await this.waitForTableLoaded();
    return (lastPage - 1) * perPage + await this.tableRows.count();
  }

  async clickGoBack() {
    await this.goBackBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('  → Clicked Go Back');
  }
}

module.exports = { ConfirmGRNPage };
