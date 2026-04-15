// ═════════════════════════════════════════════════════════════════════════════
//  Master PO Planning – Full Flow
//  Edit smoke/data/masterPOData.js to change style / schedule / quantities.
//
//  Run: npx playwright test smoke/master-po-flow.spec.js --config=flo-smoke/playwright.config.js --headed
//  Or:  npm run smoke:headed (runs both spec files; use --grep to target this one)
// ═════════════════════════════════════════════════════════════════════════════

const { test, expect } = require('@playwright/test');
const { FLO_CONFIG } = require('../flo-smoke/config/credentials');
const data           = require('./data/masterPOData');

// ── Screenshot helper – attaches to the Playwright HTML report ────────────────
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
test.setTimeout(300_000); // 5 min – the full flow takes time

test('Master PO Planning – Full Flow', async ({ page }) => {

  // ══════════════════════════════════════════════════════════════════════════
  //  LOGIN
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Login', async () => {
    try {
      console.log('\n[Login] Navigating to FLO UAT…');
      await page.goto(FLO_CONFIG.baseURL, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Login] Filling credentials on Keycloak…');
      await page.getByRole('textbox', { name: 'Username or email' }).fill(FLO_CONFIG.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(FLO_CONFIG.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Wait for redirect back to FLO
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

      // Style dropdown
      await page.getByText('Select Style').nth(1).click();
      await page.getByRole('combobox').filter({ hasText: 'Select Style' })
        .getByRole('textbox').fill(data.style.slice(-3)); // search by last 3 chars
      await page.getByRole('option', { name: data.style }).click();

      // Schedule dropdown
      await page.getByText('Select Schedule').nth(1).click();
      await page.getByRole('combobox').filter({ hasText: 'Select Schedule' })
        .getByRole('textbox').fill(data.schedule);
      await page.getByRole('option').first().click(); // pick first matching option

      // Click outside to close dropdown, then Search
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('[Step1] Search complete – clicking Proceed…');

      await page.getByRole('button', { name: 'Proceed' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('[Step1] Proceed clicked.');
    } catch (err) { await failStep(page, 'Step 1 – Master PO Selection', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 3 – JOB PREFERENCE
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 3 – Job Preference', async () => {
    try {
      console.log('\n[Step3] Navigating to Job Preference…');
      await page.getByRole('button', { name: 'Job Preference' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Bundle type
      await page.getByText('Please SelectPlan Bundles').click();
      await page.getByRole('option', { name: 'Plan Bundles' }).click();

      // Component base
      await page.getByRole('combobox').nth(2).click();
      await page.getByRole('option', { name: 'Component Group' }).click();

      // Sewing job type
      await page.getByRole('combobox').nth(3).click();
      await page.getByRole('option', { name: 'Cut Based Sewing Job' }).click();

      // Sewing job feature
      await page.locator('#sewingJobFeature .ant-select-arrow').click();
      await page.getByRole('option', { name: 'PO/Schedule' }).last().click();

      // Logical bundle quantity
      await page.getByRole('spinbutton', { name: '* Logical Bundle Quantity:' }).fill(data.logicalBundleQty);

      // Packing list features – .last() targets the most recently opened antd dropdown
      await page.locator('#packingListFeatures .ant-select-arrow').click();
      await page.getByRole('option', { name: 'PO/Schedule' }).last().click();

      console.log('[Step3] Saving Job Preference…');
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Max Plies (appears after Save)
      console.log(`[Step3] Setting Max Plies to ${data.maxPlies}…`);
      await page.getByRole('textbox', { name: '* Max Plies:' }).waitFor({ state: 'visible', timeout: 15000 });
      await page.getByRole('textbox', { name: '* Max Plies:' }).fill(data.maxPlies);
      await page.getByRole('button', { name: 'Update' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('[Step3] Job Preference saved.');
    } catch (err) { await failStep(page, 'Step 3 – Job Preference', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 4 – FABRIC PROPERTIES
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 4 – Fabric Properties', async () => {
    try {
      console.log('\n[Step4] Editing Fabric Properties…');

      const drawer = page.locator('.ant-drawer-wrapper-body');

      // ── Row 1 ───────────────────────────────────────────────────────────
      console.log('[Step4] Editing fabric row 1…');
      await page.getByRole('button', { name: 'icon: edit' }).first().click();
      // Wait for the input itself – drawer animation may still be running when element becomes 'visible'
      const pwInput1 = drawer.getByRole('textbox', { name: '* Purchase Width:' });
      await pwInput1.waitFor({ state: 'visible', timeout: 15000 });
      await pwInput1.click();
      await pwInput1.fill(data.fabricRow1.purchaseWidth);

      await drawer.locator('#fabricCategory .ant-select-selection__rendered').click();
      await page.getByRole('option', { name: data.fabricRow1.fabricCategory }).first().click();

      // Fabric Type – nth(1) because drawer has 2 comboboxes: [0]=FabricCategory, [1]=FabricType
      await drawer.getByRole('combobox').nth(1).click();
      await page.getByRole('option', { name: data.fabricRow1.fabricType }).first().click();

      await drawer.getByRole('textbox', { name: '* GSM:' }).click();
      await drawer.getByRole('textbox', { name: '* GSM:' }).fill(data.fabricRow1.gsm);

      // Save row 1 – must close drawer before row 2 edit button is clickable
      await drawer.getByRole('button', { name: 'Update' }).click();
      await drawer.waitFor({ state: 'hidden', timeout: 15000 });
      console.log('[Step4] Row 1 updated.');

      // ── Row 2 ───────────────────────────────────────────────────────────
      console.log('[Step4] Editing fabric row 2…');
      // nth(1) – after row 1 drawer closes both rows show icon:edit; .first() would re-open row 1
      await page.getByRole('button', { name: 'icon: edit' }).nth(1).click();
      const pwInput2 = drawer.getByRole('textbox', { name: '* Purchase Width:' });
      await pwInput2.waitFor({ state: 'visible', timeout: 15000 });
      await pwInput2.click();
      await pwInput2.fill(data.fabricRow2.purchaseWidth);

      // Fabric category – click rendered area to open/focus, then type search term
      await drawer.locator('#fabricCategory .ant-select-selection__rendered').click();
      await page.keyboard.type(data.fabricRow2.fabricCategorySearch);
      await page.getByRole('option', { name: data.fabricRow2.fabricCategory }).click();

      // Fabric type – nth(1): [0]=FabricCategory, [1]=FabricType
      await drawer.getByRole('combobox').nth(1).click();
      await page.getByRole('option', { name: data.fabricRow2.fabricType }).click();

      await drawer.getByRole('textbox', { name: '* GSM:' }).fill(data.fabricRow2.gsm);
      await drawer.getByRole('button', { name: 'Update' }).click();
      await drawer.waitFor({ state: 'hidden', timeout: 15000 });
      console.log('[Step4] Row 2 updated.');
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step4] Saving Fabric Properties…');
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('[Step4] Fabric Properties saved.');
    } catch (err) { await failStep(page, 'Step 4 – Fabric Properties', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 5 – COMPONENT GROUP ASSIGNMENT
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 5 – Component Group Assignment', async () => {
    try {
      console.log('\n[Step5] Navigating to Component Group Assignment…');
      await page.getByRole('button', { name: 'icon: right' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Enable switch for the first fabric row
      await page.getByRole('row').filter({ hasText: /FrontBottom/ }).first()
        .getByRole('switch').click();

      // Assign CG1 to FrontBottom rows – .last() because antd keeps prior dropdown options in DOM
      await page.getByText('Component GroupPlease Select').first().click();
      await page.getByRole('option', { name: 'CG1' }).last().click();

      await page.getByRole('row').filter({ hasText: /BackBottom/ }).first()
        .getByRole('combobox').click();
      await page.getByRole('option', { name: 'CG1' }).last().click();

      // Assign CG2 to remaining rows
      await page.getByRole('combobox').filter({ hasText: 'Component GroupPlease Select' }).first().click();
      await page.getByRole('option', { name: 'CG2' }).last().click();

      await page.getByRole('combobox').filter({ hasText: 'Component GroupPlease Select' }).click();
      await page.getByRole('option', { name: 'CG2' }).last().click();

      console.log('[Step5] Saving Component Group Assignment…');
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('[Step5] Component Group Assignment saved.');
    } catch (err) { await failStep(page, 'Step 5 – Component Group Assignment', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 6 – REPLACEMENT GROUP
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 6 – Replacement Group', async () => {
    try {
      console.log('\n[Step6] Adding Replacement Groups…');
      // App auto-advances to Step 6 after Step 5 saves – no icon:right navigation needed

      const replDrawer = page.locator('.ant-drawer-wrapper-body');

      // Add first replacement group
      await page.locator('.anticon-plus-circle').first().click();
      await replDrawer.waitFor({ state: 'visible', timeout: 10000 });

      // Open Select Components dropdown (single combobox in this drawer)
      await replDrawer.getByRole('combobox').click();
      await page.getByRole('option', { name: /FrontBottom/ }).click();

      // Fill description (description textbox follows the combobox in the form)
      await replDrawer.locator('input[type="text"]').last().fill('test');
      await replDrawer.getByRole('button', { name: 'Create' }).click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('[Step6] Replacement group 1 created.');

      // Add second replacement group
      await page.locator('tr:nth-child(2) > td:nth-child(13) .anticon-plus-circle').click();
      await replDrawer.waitFor({ state: 'visible', timeout: 10000 });

      // Select component for row 2 (GussetLiningBck)
      await replDrawer.getByRole('combobox').click();
      await page.getByRole('option', { name: /GussetLiningBck/ }).click();

      await replDrawer.locator('input[type="text"]').last().fill('test');
      await replDrawer.getByRole('button', { name: 'Create' }).click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('[Step6] Replacement group 2 created.');
    } catch (err) { await failStep(page, 'Step 6 – Replacement Group', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 7 – ADD ADDITIONAL QTY
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 7 – Add Additional Qty', async () => {
    try {
      console.log('\n[Step7] Navigating to Add Additional Qty…');
      await page.getByRole('button', { name: 'icon: right' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Extra shipment %
      await page.getByRole('spinbutton').nth(1).fill(data.processWastage);

      // Sample type
      await page.getByRole('main').getByRole('combobox').click();
      await page.getByRole('textbox').first().fill('pi');
      await page.getByRole('option', { name: data.sampleType }).click();

      // Sample qty
      await page.getByRole('spinbutton').first().fill(data.sampleQty);

      console.log('[Step7] Submitting Add Additional Qty…');
      await page.getByRole('button', { name: 'Submit' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('[Step7] Additional Qty submitted.');
    } catch (err) { await failStep(page, 'Step 7 – Add Additional Qty', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 8–9 – SUB PO CREATION & SUB PO RATIO
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 8-9 – Sub PO Creation and Sub PO Ratio', async () => {
    try {
      console.log('\n[Step8] Navigating through Sub PO Creation…');
      await page.getByRole('button', { name: 'icon: right' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.getByRole('button', { name: 'icon: right' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step9] Adding Sub PO Ratios…');
      for (let i = 0; i < data.ratios.length; i++) {
        const ratio = data.ratios[i];
        console.log(`[Step9] Adding ratio ${i + 1} (${ratio.type})…`);

        await page.getByRole('button', { name: 'Add Ratio' }).nth(i === 0 ? 0 : 1).click();
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

        // Ratio type
        await page.getByRole('dialog', { name: 'Ratio Creation' }).getByRole('combobox').click();
        await page.getByRole('option', { name: ratio.type }).last().click();

        // Description
        await page.getByRole('textbox', { name: '* Description:' }).fill(ratio.description);

        // Size quantities (XS, S, M, L, XL) — spinbuttons nth(2..6) inside dialog
        await page.getByRole('spinbutton').nth(2).fill(ratio.sizes[0]); // XS
        await page.getByRole('spinbutton').nth(3).fill(ratio.sizes[1]); // S
        await page.getByRole('spinbutton').nth(4).fill(ratio.sizes[2]); // M
        await page.getByRole('spinbutton').nth(5).fill(ratio.sizes[3]); // L
        await page.getByRole('spinbutton').nth(6).fill(ratio.sizes[4]);

        // Plies
        await page.getByRole('spinbutton', { name: '* Ratio plies:' }).fill(ratio.plies);

        // Total sets (if provided)
        if (ratio.totalSets) {
          await page.getByRole('spinbutton').nth(2).fill(ratio.totalSets);
        }

        await page.getByRole('button', { name: 'Save ratio' }).click();
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        console.log(`[Step9] Ratio ${i + 1} saved.`);
      }
    } catch (err) { await failStep(page, 'Step 8-9 – Sub PO Ratio', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 10 – SUB PO MARKER VERSIONS
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 10 – Sub PO Marker Versions', async () => {
    try {
      console.log('\n[Step10] Navigating to Sub PO Marker Versions…');
      await page.getByRole('button', { name: 'icon: right' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Select Sub PO from dropdown (take first available option)
      await page.locator('.ant-row > .ant-row > .ant-col.ant-form-item-control-wrapper > .ant-form-item-control > .ant-form-item-children > .ant-select .ant-select-arrow').click();
      await page.getByRole('option').first().click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      for (let i = 0; i < data.markerVersions.length; i++) {
        const mv = data.markerVersions[i];
        console.log(`[Step10] Adding marker version ${mv.version} to row ${i + 1}…`);

        // Always click the FIRST "Expand row" cell – once a row expands its cell
        // becomes "Collapse row", so the next unexpanded row is always first.
        await page.getByRole('cell', { name: 'Expand row' }).first().click();
        await page.waitForLoadState('networkidle', { timeout: 10000 });

        // Click the correct row's "Add Marker Version" button using nth(i)
        await page.getByRole('cell', { name: 'Add Marker Version' }).nth(i).click();

        await page.locator('#markerVersionForm_markerVersion').fill(mv.version);

        // Only one inline form is active at a time – same selector works for every row
        await page.locator('#markerVersionForm_markerTypeId .ant-select-arrow').click();
        await page.getByRole('option', { name: mv.markerType }).click();

        await page.locator('#markerVersionForm_shrinkage').fill(mv.shrinkage);
        await page.locator('#markerVersionForm_width').fill(mv.width);
        await page.locator('#markerVersionForm_length').fill(mv.length);
        await page.locator('#markerVersionForm_perimeter').fill(mv.perimeter);

        await page.getByRole('button', { name: 'Save' }).click();
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        console.log(`[Step10] Marker version ${mv.version} saved.`);
      }
    } catch (err) { await failStep(page, 'Step 10 – Sub PO Marker Versions', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 12 – PACKING LIST
  //  Flow: View → set type → Add method → configure → Save →
  //        Click create-pack icon → wait for toast → navigate away →
  //        come back → verify icon changed to Delete (don't click)
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 12 – Packing List', async () => {
    try {
      console.log('\n[Step12] Navigating to Packing List…');
      // Navigate forward to Markers Summary then click Packing List stepper button
      await page.getByRole('button', { name: 'icon: right' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.getByRole('button', { name: 'Packing List' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Set packing type
      await page.getByRole('combobox').nth(3).click();
      await page.getByRole('option', { name: 'Single Color Single Size' }).click();

      // Add packing method
      console.log('[Step12] Adding packing method…');
      await page.getByRole('button', { name: 'Add packing method' }).click();

      const packDialog = page.getByRole('dialog');
      await packDialog.waitFor({ state: 'visible', timeout: 15000 });

      await packDialog.getByRole('textbox', { name: '* Packing Method Name:' }).fill(data.packingMethod.name);
      await packDialog.getByRole('textbox', { name: 'Description:' }).fill(data.packingMethod.description);

      // Fill Pcs Per Polybag and Polybags Per Carton for each size row.
      // Scope to the last table inside the dialog (size data table) to avoid
      // background page spinbuttons that are covered by the overlay.
      const sizeInputs = packDialog.locator('table').last().locator('.ant-input-number-input:not([disabled])');
      const count = await sizeInputs.count();
      for (let i = 0; i < count; i++) {
        await sizeInputs.nth(i).click();
        await sizeInputs.nth(i).fill(data.packingMethod.sizeQty);
      }

      await packDialog.getByRole('button', { name: 'Calculate' }).click();
      await page.waitForTimeout(1000);

      console.log('[Step12] Saving packing method…');
      await packDialog.getByRole('button', { name: 'Save' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // ── Create pack jobs ─────────────────────────────────────────────────
      console.log('[Step12] Creating pack jobs (clicking dropbox icon)…');
      await page.locator('.anticon-dropbox').first().click();

      // Wait for "Pack jobs creation started" toast notification
      await page.getByText('Pack jobs creation started')
        .waitFor({ state: 'visible', timeout: 30000 });
      console.log('[Step12] Pack jobs creation started – toast confirmed.');

      // Navigate to Generate Dockets (next tab) and come back
      await page.getByRole('button', { name: 'icon: right', exact: true }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('[Step12] Navigated away to next tab.');

      await page.getByRole('button', { name: 'icon: left' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('[Step12] Came back to Packing List.');

      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // ── Verify create icon changed to Delete ─────────────────────────────
      console.log('[Step12] Verifying pack list icon changed to Delete…');
      await expect(page.locator('.anticon-delete').first())
        .toBeVisible({ timeout: 30000 });
      console.log('[Step12] ✓ Delete icon visible – pack jobs confirmed. NOT clicking delete.');

      // Navigate forward to Generate Dockets
      await page.getByRole('button', { name: 'icon: right', exact: true }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch (err) { await failStep(page, 'Step 12 – Packing List', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 13 – GENERATE DOCKETS
  //  Wait condition: button changes from "Generate Docket" → "Delete Docket"
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 13 – Generate Dockets', async () => {
    try {
      console.log('\n[Step13] Generating Dockets…');

      // ── Helper: poll via reload until a "Delete Docket" button appears in the
      //   given table row element. Re-queries the row by its RM SKU text on every
      //   poll cycle to avoid stale element references after DOM updates.
      async function pollUntilDeleteDocket(rmSku, rowLabel) {
        const deadline = Date.now() + 180_000;
        while (Date.now() < deadline) {
          await page.waitForTimeout(15_000);
          await page.locator('.anticon-reload').click();
          await page.waitForLoadState('networkidle', { timeout: 15_000 });
          // Re-query the row fresh after each reload
          const row = page.getByRole('row', { name: new RegExp(rmSku) }).first();
          const deleteBtn = row.getByRole('button', { name: /delete docket/i });
          if (await deleteBtn.isVisible()) {
            console.log(`[Step13] ✓ ${rowLabel} – "Delete Docket" confirmed.`);
            return;
          }
          console.log(`[Step13] ${rowLabel} still processing… polling again.`);
        }
        throw new Error(`${rowLabel}: "Delete Docket" not visible after 3 minutes`);
      }

      // ── Wait until BOTH "Generate Docket" buttons are present and visible ───
      // Use exact:true so the stepper button "13 Generate Dockets" is NOT matched.
      console.log('[Step13] Waiting for both Generate Docket buttons to be ready…');
      await expect(page.getByRole('button', { name: 'Generate Docket', exact: true }))
        .toHaveCount(2, { timeout: 30000 });
      await expect(page.getByRole('button', { name: 'Generate Docket', exact: true }).first())
        .toBeEnabled({ timeout: 15000 });
      await expect(page.getByRole('button', { name: 'Generate Docket', exact: true }).nth(1))
        .toBeEnabled({ timeout: 15000 });
      console.log('[Step13] Both Generate Docket buttons are visible and enabled.');

      // ── Row 1 – FWFT00023 (CG1) ─────────────────────────────────────────────
      console.log('[Step13] Clicking Generate Docket for row 1 (FWFT00023)…');
      const row1 = page.getByRole('row', { name: /FWFT00023/ }).first();
      await row1.getByRole('button', { name: 'Generate Docket', exact: true }).click();
      console.log('[Step13] Row 1 clicked – polling for Delete Docket…');
      await pollUntilDeleteDocket('FWFT00023', 'Row 1 (FWFT00023)');

      // ── Row 2 – FWFT00048 (CG2) ─────────────────────────────────────────────
      console.log('[Step13] Clicking Generate Docket for row 2 (FWFT00048)…');
      const row2 = page.getByRole('row', { name: /FWFT00048/ }).first();
      await row2.getByRole('button', { name: 'Generate Docket', exact: true }).click();
      console.log('[Step13] Row 2 clicked – polling for Delete Docket…');
      await pollUntilDeleteDocket('FWFT00048', 'Row 2 (FWFT00048)');

      console.log('[Step13] ✓ All dockets generated.');
    } catch (err) { await failStep(page, 'Step 13 – Generate Dockets', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 14 – GENERATE LAY JOB
  //  Wait condition: "Generate Lay Job" disabled + "Delete Lay Job" visible
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 14 – Generate Lay Job', async () => {
    try {
      console.log('\n[Step14] Navigating to Generate Lay Job…');
      // Navigate from Generate Dockets → Generate Lay Job via the stepper button
      await page.getByRole('button', { name: '14 Generate Lay Job' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step14] Clicking Generate Lay Job…');
      await page.getByRole('button', { name: 'Generate Lay Job', exact: true }).click();
      console.log('[Step14] Waiting for Generate Lay Job to be disabled…');

      await expect(page.getByRole('button', { name: 'Generate Lay Job', exact: true }))
        .toBeDisabled({ timeout: 60000 });
      await expect(page.getByRole('button', { name: /delete lay job/i }))
        .toBeVisible({ timeout: 60000 });
      console.log('[Step14] ✓ Lay Job generated – Delete Lay Job button confirmed.');
    } catch (err) { await failStep(page, 'Step 14 – Generate Lay Job', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 15 – DOCKET VIEW
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 15 – Docket View', async () => {
    try {
      console.log('\n[Step15] Opening Docket View…');
      await page.getByRole('button', { name: 'Docket View' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Select first available option from the Sub PO dropdown
      await page.locator('.ant-col > .ant-row > .ant-col.ant-form-item-control-wrapper > .ant-form-item-control .ant-select-arrow').click();
      await page.getByRole('option').first().click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // View first docket
      await page.locator('.anticon-eye').first().click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await page.getByRole('button', { name: 'Close' }).click();

      // View second docket
      await page.getByRole('cell', { name: 'icon: eye' }).nth(1).click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await page.getByRole('button', { name: 'Close' }).click();
      await page.waitForSelector('.ant-modal-wrap', { state: 'hidden', timeout: 10000 });
      console.log('[Step15] Docket View completed.');
    } catch (err) { await failStep(page, 'Step 15 – Docket View', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 16 – SEWING JOBS GENERATION
  //  Wait condition: after clicking Generate with qty, wait for eye icon
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 16 – Sewing Jobs Generation', async () => {
    try {
      console.log('\n[Step16] Generating Sewing Jobs…');
      await page.getByRole('button', { name: 'Sewing Jobs generation' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Select the checkbox for the first row
      await page.getByLabel('', { exact: true }).nth(3).check();

      // Open the generate drawer
      await page.getByRole('button', { name: 'Generate Sewing Jobs' }).first().click();
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

      // Fill quantity
      await page.getByRole('spinbutton', { name: '* Sewing job Quantity:' }).fill(data.sewingJobQty);

      // The generation is async – the drawer stays open until the server finishes.
      // Retry clicking "Generate Sewing Jobs" (inside the drawer) every 10 s until
      // the drawer closes (i.e. the drawer's "Close" button disappears).
      // The drawer title "Cut Based Sewing Job" + Close button identify it uniquely.
      const drawerTitle = page.locator('text=Cut Based Sewing Job').last();

      const deadline = Date.now() + 120_000;
      let drawerClosed = false;
      while (Date.now() < deadline) {
        // Click the Generate button inside the drawer (it's the last/active one)
        const genBtnInDrawer = page.getByRole('button', { name: 'Generate Sewing Jobs' }).last();
        await genBtnInDrawer.click();
        console.log('[Step16] Generate Sewing Jobs clicked – waiting for drawer to close…');

        // Wait up to 15 s for the drawer to close
        try {
          await drawerTitle.waitFor({ state: 'hidden', timeout: 15000 });
          drawerClosed = true;
          break;
        } catch {
          console.log('[Step16] Drawer still open, retrying…');
        }
      }
      if (!drawerClosed) throw new Error('Sewing jobs drawer did not close within 2 minutes');

      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log('[Step16] Waiting for sewing job eye/view icon to appear…');
      await page.locator('.anticon-eye').first()
        .waitFor({ state: 'visible', timeout: 60000 });
      console.log('[Step16] ✓ Sewing Jobs generated – view icon confirmed.');
    } catch (err) { await failStep(page, 'Step 16 – Sewing Jobs Generation', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 17 – VIEW SEWING JOBS
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 17 – View Sewing Jobs', async () => {
    try {
      console.log('\n[Step17] Viewing Sewing Jobs…');
      await page.locator('.anticon-eye').first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Print first sewing job ticket
      await page.getByRole('cell', { name: 'icon: printer' }).nth(4).click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await page.getByRole('button', { name: 'Close' }).click();
      console.log('[Step17] Sewing Jobs viewed.');
    } catch (err) { await failStep(page, 'Step 17 – View Sewing Jobs', err); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 18 – VIEW EMBELLISHMENT JOBS
  //  Verification: schedule (from data file) must be visible on the page
  // ══════════════════════════════════════════════════════════════════════════
  await test.step('Step 18 – View Embellishment Jobs (verify schedule)', async () => {
    try {
      console.log('\n[Step18] Navigating to View Embellishment Jobs…');
      await page.getByRole('button', { name: 'View Embellishment Jobs' }).click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      console.log(`[Step18] Verifying schedule "${data.schedule}" is visible…`);
      await expect(
        page.getByText(data.schedule, { exact: true }),
        `Schedule "${data.schedule}" must be visible on View Embellishment Jobs page`
      ).toBeVisible({ timeout: 20000 });

      console.log(`[Step18] ✓ Schedule "${data.schedule}" verified successfully.`);
    } catch (err) { await failStep(page, 'Step 18 – View Embellishment Jobs', err); }
  });

  console.log('\n' + '═'.repeat(60));
  console.log('  MASTER PO FLOW COMPLETE ✓');
  console.log('═'.repeat(60) + '\n');
});
