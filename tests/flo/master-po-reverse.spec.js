// ═════════════════════════════════════════════════════════════════════════════
//  Master PO Planning – Reversal Flow
//  Undoes all steps of the Master PO Planning flow in reverse order.
//  Edit data/flo/masterPOReverseData.js to set the style and schedule.
//  Run: npm run master-po-reverse:headed
// ═════════════════════════════════════════════════════════════════════════════

const { test, expect } = require('@playwright/test');
const { FLO_CONFIG } = require('../../config/flo/credentials');
const data           = require('../../data/flo/masterPOReverseData');

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

      await page.locator('.anticon-reload').click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await expect(page.locator('.anticon-delete').first())
        .not.toBeVisible({ timeout: 15000 });
      console.log('[Step16R] ✓ Sewing Jobs deleted – delete icon confirmed gone.');
    } catch (err) { await failStep(page, 'Step 16R – Delete Sewing Jobs', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 14R – DELETE LAY JOB
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
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 13R – Delete Dockets', async () => {
    try {
      console.log('\n[Step13R] Navigating to Generate Dockets…');
      await page.getByRole('button', { name: /generate dockets/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step13R] Waiting for both Delete Docket buttons…');
      await expect(page.getByRole('button', { name: 'Delete Docket', exact: true }))
        .toHaveCount(2, { timeout: 30000 });

      async function retryDeleteDocket(rowLabel, expectedRemaining) {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          await page.locator('#loading-spinner')
            .waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

          console.log(`[Step13R] Clicking Delete Docket – ${rowLabel}…`);
          await page.waitForTimeout(2000);
          await page.getByRole('button', { name: 'Delete Docket', exact: true }).first().click();
          await page.getByRole('button', { name: 'OK' }).click();

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

      await retryDeleteDocket('Row 1', 1);
      await retryDeleteDocket('Row 2', 0);

      await expect(page.getByRole('button', { name: 'Generate Docket', exact: true }))
        .toHaveCount(2, { timeout: 30000 });
      console.log('[Step13R] ✓ Both dockets deleted – Generate Docket buttons confirmed.');
    } catch (err) { await failStep(page, 'Step 13R – Delete Dockets', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 12R – DELETE PACKING LIST
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 12R – Delete Packing List', async () => {
    try {
      console.log('\n[Step12R] Navigating to Packing List…');
      await page.getByRole('button', { name: 'Packing List' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.locator('table').last().waitFor({ state: 'visible', timeout: 15000 });

      console.log('[Step12R] Clicking delete in Pack List column…');
      await page.waitForTimeout(2000);
      await page.locator('button.ant-btn[style*="background: inherit"] .anticon-delete')
        .first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step12R] Clicking delete in Action column…');
      await page.waitForTimeout(2000);
      await page.locator('i.anticon-delete[tabindex="-1"]').first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step12R] ✓ Packing List deleted.');
    } catch (err) { await failStep(page, 'Step 12R – Delete Packing List', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 10R – DELETE MARKER VERSIONS
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 10R – Delete Marker Versions', async () => {
    try {
      console.log('\n[Step10R] Navigating to Sub PO Marker Versions…');
      await page.getByRole('button', { name: /marker versions/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.locator(
        '.ant-row > .ant-row > .ant-col.ant-form-item-control-wrapper > ' +
        '.ant-form-item-control > .ant-form-item-children > .ant-select .ant-select-arrow'
      ).click();
      await page.getByRole('option').first().click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      for (let rowIdx = 0; rowIdx < 2; rowIdx++) {
        console.log(`[Step10R] Expanding row ${rowIdx + 1}…`);

        await page.getByRole('cell', { name: 'Expand row' }).first().click();

        await page.getByRole('button', { name: 'Delete', exact: true })
          .first().waitFor({ state: 'visible', timeout: 15000 });
        console.log(`[Step10R] Row ${rowIdx + 1} expanded – clicking delete…`);

        await page.waitForTimeout(2000);
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
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 9R – Delete Sub PO Ratios', async () => {
    try {
      console.log('\n[Step9R] Navigating to Sub PO Ratio…');
      await page.getByRole('button', { name: /sub po ratio/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step9R] Deleting ratio row 1…');
      await page.waitForTimeout(2000);
      await page.locator('i.anticon-delete[style*="color: red"]').first().click();
      await page.getByRole('button', { name: 'OK' }).click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('[Step9R] Ratio 1 deleted.');

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
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 7R – Delete Additional Qty', async () => {
    try {
      console.log('\n[Step7R] Navigating to Add Additional Qty…');
      await page.getByRole('button', { name: /additional qty/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

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
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 6R – Delete Replacement Groups', async () => {
    try {
      console.log('\n[Step6R] Navigating to Replacement Group…');
      await page.getByRole('button', { name: /replacement group/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step6R] Deleting replacement group 1…');
      await page.waitForTimeout(2000);
      await page.locator('.anticon-delete').first().click();
      await page.getByRole('button', { name: 'OK' }).click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('[Step6R] Replacement group 1 deleted.');

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
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 5R – Delete Component Group Assignment', async () => {
    try {
      console.log('\n[Step5R] Navigating to Component Group Assignment…');
      await page.getByRole('button', { name: /component group assignment/i }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step5R] Clicking Delete…');
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'Delete' }).click();

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
