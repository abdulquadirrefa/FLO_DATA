// ═════════════════════════════════════════════════════════════════════════════
//  Master PO Planning – Reversal Flow
//  Undoes all steps of the Master PO Planning flow in reverse order:
//    16R Delete Sewing Jobs  → 14R Delete Lay Job  → 13R Delete Dockets
//    → 12R Delete Packing List → 10R Delete Marker Versions
//    → 9R Delete Sub PO Ratios → 7R Delete Additional Qty
//    → 6R Delete Replacement Groups → 5R Delete Component Group Assignment
//
//  Edit smoke/data/masterPOReverseData.js to set the style and schedule.
//  Run: npm run master-po-reverse:headed
// ═════════════════════════════════════════════════════════════════════════════

const { test, expect } = require('@playwright/test');
const { FLO_CONFIG } = require('../flo-smoke/config/credentials');
const data           = require('./data/masterPOReverseData');

// ── Screenshot helper ─────────────────────────────────────────────────────────
async function failStep(page, stepName, err) {
  console.error(`\n[FAIL] ${stepName}: ${err.message}`);
  const screenshot = await page.screenshot({ fullPage: true });
  await test.info().attach(`FAIL – ${stepName}`, {
    body:        screenshot,
    contentType: 'image/png',
  });
  throw err;
}

// ─────────────────────────────────────────────────────────────────────────────
test.setTimeout(300_000); // 5 min

test('Master PO Planning – Reversal Flow', async ({ page }) => {

  // ══════════════════════════════════════════════════════════════════════════
  //  LOGIN
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Login', async () => {
    try {
      console.log('\n[Login] Navigating to FLO UAT…');
      await page.goto(FLO_CONFIG.baseURL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.getByRole('textbox', { name: 'Username or email' }).fill(FLO_CONFIG.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(FLO_CONFIG.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForURL((url) => url.hostname === 'flo.uat.brandixlk.org', { timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log(`[Login] Logged in – URL: ${page.url()}`);
    } catch (err) { await failStep(page, 'Login', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  NAVIGATE TO PPS › MASTER PO PLANNING
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Navigate to PPS > Master PO Planning', async () => {
    try {
      console.log('\n[Nav] Expanding PPS menu…');
      await page.getByRole('menu').locator('div').filter({ hasText: 'PPS' }).click();
      await page.getByRole('link', { name: 'Master PO Planning' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('[Nav] Master PO Planning page loaded.');
    } catch (err) { await failStep(page, 'Navigate to PPS > Master PO Planning', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 1 – MASTER PO SELECTION: search & proceed
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 1 – Master PO Selection: Search and Proceed', async () => {
    try {
      console.log(`\n[Step1] Searching for Style: ${data.style}, Schedule: ${data.schedule}`);

      await page.getByText('Select Style').nth(1).click();
      await page.getByRole('combobox').filter({ hasText: 'Select Style' })
        .getByRole('textbox').fill(data.style.slice(-3));
      await page.getByRole('option', { name: data.style }).click();

      await page.getByText('Select Schedule').nth(1).click();
      await page.getByRole('combobox').filter({ hasText: 'Select Schedule' })
        .getByRole('textbox').fill(data.schedule);
      await page.getByRole('option').first().click();

      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.getByRole('button', { name: 'Proceed' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('[Step1] Proceed clicked – beginning reversal steps.');
    } catch (err) { await failStep(page, 'Step 1 – Master PO Selection', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 16R – DELETE SEWING JOBS
  //  Click delete icon → OK → wait → reload → verify icon gone
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 16R – Delete Sewing Jobs', async () => {
    try {
      console.log('\n[Step16R] Navigating to Sewing Jobs generation…');
      await page.getByRole('button', { name: 'Sewing Jobs generation' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step16R] Clicking Delete icon for sewing job…');
      await page.waitForTimeout(2000);
      await page.locator('.anticon-delete').first().click();

      await page.getByRole('button', { name: 'OK' }).click();
      console.log('[Step16R] Confirmed – waiting a few seconds…');
      await page.waitForTimeout(5000);

      // Reload to check whether deletion completed
      await page.locator('.anticon-reload').click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Verify delete icon is gone (sewing job removed)
      await expect(page.locator('.anticon-delete').first())
        .not.toBeVisible({ timeout: 15000 });
      console.log('[Step16R] ✓ Sewing Jobs deleted – delete icon confirmed gone.');
    } catch (err) { await failStep(page, 'Step 16R – Delete Sewing Jobs', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 14R – DELETE LAY JOB
  //  Retry clicking Delete Lay Job + OK until the button becomes disabled.
  //  The server may reject the first attempt – keep retrying until success.
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 14R – Delete Lay Job', async () => {
    try {
      console.log('\n[Step14R] Navigating to Generate Lay Job…');
      await page.getByRole('button', { name: '14 Generate Lay Job' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      const deleteLayJobBtn = page.getByRole('button', { name: /delete lay job/i });
      const deadline = Date.now() + 120_000;
      let deleted = false;

      while (Date.now() < deadline) {
        // If button is already disabled a previous attempt succeeded – exit immediately
        if (await deleteLayJobBtn.isDisabled()) {
          deleted = true;
          break;
        }

        console.log('[Step14R] Clicking Delete Lay Job…');
        await page.waitForTimeout(2000);
        await deleteLayJobBtn.click();
        await page.getByRole('button', { name: 'OK' }).click();

        try {
          await expect(deleteLayJobBtn).toBeDisabled({ timeout: 20000 });
          deleted = true;
          break;
        } catch {
          console.log('[Step14R] Button still active – retrying…');
        }
      }
      if (!deleted) throw new Error('Delete Lay Job did not become disabled within 2 minutes');
      console.log('[Step14R] ✓ Lay Job deleted.');
    } catch (err) { await failStep(page, 'Step 14R – Delete Lay Job', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 13R – DELETE DOCKETS
  //  For each row: retry clicking Delete Docket + OK until that row's button
  //  reverts to "Generate Docket". Both rows are verified individually.
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 13R – Delete Dockets', async () => {
    try {
      console.log('\n[Step13R] Navigating to Generate Dockets…');
      await page.getByRole('button', { name: /generate dockets/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Wait for both Delete Docket buttons (exact: true avoids matching stepper)
      console.log('[Step13R] Waiting for both Delete Docket buttons…');
      await expect(page.getByRole('button', { name: 'Delete Docket', exact: true }))
        .toHaveCount(2, { timeout: 30000 });

      // Helper: click Delete Docket + OK then wait for the Delete Docket count
      // to reach expectedRemaining. Retries if the loading spinner blocks the click
      // or the DOM hasn't updated yet.
      // expectedRemaining: 1 for row 1 (row 2 still pending), 0 for row 2.
      async function retryDeleteDocket(rowLabel, expectedRemaining) {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          // Wait for any full-page loading spinner to clear before clicking
          await page.locator('#loading-spinner')
            .waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

          console.log(`[Step13R] Clicking Delete Docket – ${rowLabel}…`);
          await page.waitForTimeout(2000);
          await page.getByRole('button', { name: 'Delete Docket', exact: true }).first().click();
          await page.getByRole('button', { name: 'OK' }).click();

          // Wait for the Delete Docket count to drop to the expected number.
          // This is more reliable than checking for Generate Docket appearing,
          // because the DOM update can lag behind networkidle.
          try {
            await expect(page.getByRole('button', { name: 'Delete Docket', exact: true }))
              .toHaveCount(expectedRemaining, { timeout: 20000 });
            console.log(`[Step13R] ✓ ${rowLabel} – Delete Docket removed.`);
            return;
          } catch {
            console.log(`[Step13R] ${rowLabel} – count not updated yet, retrying…`);
          }
        }
        throw new Error(`${rowLabel}: Delete Docket did not clear within 2 minutes`);
      }

      // Row 1: after deletion 1 Delete Docket should remain (row 2)
      await retryDeleteDocket('Row 1', 1);

      // Row 2: after deletion 0 Delete Docket buttons should remain
      await retryDeleteDocket('Row 2', 0);

      // Final verification: both rows must show Generate Docket
      await expect(page.getByRole('button', { name: 'Generate Docket', exact: true }))
        .toHaveCount(2, { timeout: 30000 });
      console.log('[Step13R] ✓ Both dockets deleted – Generate Docket buttons confirmed.');
    } catch (err) { await failStep(page, 'Step 13R – Delete Dockets', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 12R – DELETE PACKING LIST
  //  View → click delete in Pack List column → page loads →
  //  click delete in Action column → page loads
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 12R – Delete Packing List', async () => {
    try {
      console.log('\n[Step12R] Navigating to Packing List…');
      await page.getByRole('button', { name: 'Packing List' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Wait for the bottom table to be rendered
      await page.locator('table').last().waitFor({ state: 'visible', timeout: 15000 });

      // Delete icon in the Pack List column
      // Identified by: <button class="ant-btn" style="background: inherit; border: none; padding: 0px;">
      console.log('[Step12R] Clicking delete in Pack List column…');
      await page.waitForTimeout(2000);
      await page.locator('button.ant-btn[style*="background: inherit"] .anticon-delete')
        .first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Delete icon in the Action column
      // Identified by: <i class="anticon anticon-delete" tabindex="-1">
      console.log('[Step12R] Clicking delete in Action column…');
      await page.waitForTimeout(2000);
      await page.locator('i.anticon-delete[tabindex="-1"]').first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step12R] ✓ Packing List deleted.');
    } catch (err) { await failStep(page, 'Step 12R – Delete Packing List', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 10R – DELETE MARKER VERSIONS
  //  Select Sub PO → expand both rows → delete row 1 → OK → delete row 2 → OK
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 10R – Delete Marker Versions', async () => {
    try {
      console.log('\n[Step10R] Navigating to Sub PO Marker Versions…');
      await page.getByRole('button', { name: /marker versions/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Select Sub PO from dropdown (same selector as forward flow)
      await page.locator(
        '.ant-row > .ant-row > .ant-col.ant-form-item-control-wrapper > ' +
        '.ant-form-item-control > .ant-form-item-children > .ant-select .ant-select-arrow'
      ).click();
      await page.getByRole('option').first().click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Close any open dropdown before trying to interact with the table
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Process both rows one at a time: expand → delete → networkidle → repeat.
      // Uses cell click (same as forward flow) – proven more reliable than button click.
      // After each delete, networkidle re-collapses everything, so we always expand fresh.
      for (let rowIdx = 0; rowIdx < 2; rowIdx++) {
        console.log(`[Step10R] Expanding row ${rowIdx + 1}…`);

        // Click the first remaining "Expand row" cell
        await page.getByRole('cell', { name: 'Expand row' }).first().click();

        // Wait for the Delete button inside the expanded row to be visible
        await page.getByRole('button', { name: 'Delete', exact: true })
          .first().waitFor({ state: 'visible', timeout: 15000 });
        console.log(`[Step10R] Row ${rowIdx + 1} expanded – clicking delete…`);

        await page.waitForTimeout(2000);
        // The expanded row contains a "Delete" button (not an icon) in the Action column
        await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
        await page.getByRole('button', { name: 'OK' }).click();
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        console.log(`[Step10R] Row ${rowIdx + 1} marker version deleted.`);
      }

      console.log('[Step10R] ✓ All marker versions deleted.');
    } catch (err) { await failStep(page, 'Step 10R – Delete Marker Versions', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 9R – DELETE SUB PO RATIOS
  //  Delete ratio row 1 → OK, then row 2 → OK
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 9R – Delete Sub PO Ratios', async () => {
    try {
      console.log('\n[Step9R] Navigating to Sub PO Ratio…');
      await page.getByRole('button', { name: /sub po ratio/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Delete ratio 1
      // The delete control is an <i class="anticon anticon-delete" style="color: red">
      console.log('[Step9R] Deleting ratio row 1…');
      await page.waitForTimeout(2000);
      await page.locator('i.anticon-delete[style*="color: red"]').first().click();
      await page.getByRole('button', { name: 'OK' }).click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('[Step9R] Ratio 1 deleted.');

      // Delete ratio 2 (now first)
      console.log('[Step9R] Deleting ratio row 2…');
      await page.waitForTimeout(2000);
      await page.locator('i.anticon-delete[style*="color: red"]').first().click();
      await page.getByRole('button', { name: 'OK' }).click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('[Step9R] Ratio 2 deleted.');

      console.log('[Step9R] ✓ All Sub PO Ratios deleted.');
    } catch (err) { await failStep(page, 'Step 9R – Delete Sub PO Ratios', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 7R – DELETE ADDITIONAL QTY
  //  Click the danger Delete button → OK
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 7R – Delete Additional Qty', async () => {
    try {
      console.log('\n[Step7R] Navigating to Add Additional Qty…');
      await page.getByRole('button', { name: /additional qty/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // The Delete button is an ant-btn-danger button
      console.log('[Step7R] Clicking Delete…');
      await page.waitForTimeout(2000);
      await page.locator('button.ant-btn-danger').click();
      await page.getByRole('button', { name: 'OK' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step7R] ✓ Additional Qty deleted.');
    } catch (err) { await failStep(page, 'Step 7R – Delete Additional Qty', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 6R – DELETE REPLACEMENT GROUPS
  //  Delete icon row 1 → OK → delete icon row 2 → OK
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 6R – Delete Replacement Groups', async () => {
    try {
      console.log('\n[Step6R] Navigating to Replacement Group…');
      await page.getByRole('button', { name: /replacement group/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Delete replacement group row 1
      console.log('[Step6R] Deleting replacement group 1…');
      await page.waitForTimeout(2000);
      await page.locator('.anticon-delete').first().click();
      await page.getByRole('button', { name: 'OK' }).click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('[Step6R] Replacement group 1 deleted.');

      // Delete replacement group row 2 (now first)
      console.log('[Step6R] Deleting replacement group 2…');
      await page.waitForTimeout(2000);
      await page.locator('.anticon-delete').first().click();
      await page.getByRole('button', { name: 'OK' }).click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('[Step6R] Replacement group 2 deleted.');

      console.log('[Step6R] ✓ All Replacement Groups deleted.');
    } catch (err) { await failStep(page, 'Step 6R – Delete Replacement Groups', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 5R – DELETE COMPONENT GROUP ASSIGNMENT
  //  Click Delete button (confirm OK if dialog appears) → done
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 5R – Delete Component Group Assignment', async () => {
    try {
      console.log('\n[Step5R] Navigating to Component Group Assignment…');
      await page.getByRole('button', { name: /component group assignment/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step5R] Clicking Delete…');
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'Delete' }).click();

      // Confirm if a dialog appears
      const okBtn = page.getByRole('button', { name: 'OK' });
      if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await okBtn.click();
      }
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step5R] ✓ Component Group Assignment deleted.');
      console.log('\n' + '═'.repeat(60));
      console.log('  REVERSAL FLOW COMPLETE');
      console.log('═'.repeat(60) + '\n');
    } catch (err) { await failStep(page, 'Step 5R – Delete Component Group Assignment', err); }
  });

});
