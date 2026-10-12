// API port of the GRN steps — PL creation → Mark as In-House → scan → Confirm GRN
// (Update M3) — calling the same backend endpoints the GRN web app uses, no browser.
//
// Based on the Java grn/functions/*_API.java (used by TCSFCS01C/01H/PRE006; commented
// out in TCSFCS01A, which is why dataCreationApiFlow.js stopped at PO approval), with
// the parts that have since changed in the app brought up to date:
//   - entry number: the app's "Auto Generate" is Date.now(), not last entry + 1
//   - Update M3: rows are cached (grn/cache-records) then processed with PUT grn/process/{wh}
//   - scan location: the device's 100262 / B03, not 111 / LOC-100262
const crypto = require('crypto');
const { URLS } = require('../../../config/urls');
const { postGraphQL, sleep } = require('../graphqlClient'); // also turns off TLS verification for the UAT certs
const { loadTemplate } = require('../m3/flowHelpers');

const CLIENT_ID = 'warehouse_service_front';

// ── Login ───────────────────────────────────────────────────────────

/**
 * Keycloak auth-code login, the way the browser does it (ports LogInFunc_API:
 * openGRN → logInToGRN → getToken). The token lasts 60 days, so one login covers a run.
 */
async function login(env, cfg, username, password) {
  const { GRN, GRN_KEYCLOAK } = URLS[env];
  const redirectUri = new URL('/select-warehouse', GRN).href;

  const cookies = new Map();
  const keepCookies = (res) => {
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const i = pair.indexOf('=');
      cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
  };

  const authPage = await fetch(`${GRN_KEYCLOAK}/auth?${new URLSearchParams({
    client_id: CLIENT_ID, redirect_uri: redirectUri, state: crypto.randomUUID(),
    response_mode: 'fragment', response_type: 'code', scope: 'openid', nonce: crypto.randomUUID(),
  })}`, { redirect: 'manual' });
  keepCookies(authPage);
  const action = (await authPage.text()).match(/id="kc-form-login"[^>]*action="([^"]+)"/)?.[1];
  if (!action) throw httpError(`GRN login: Keycloak login form not found (HTTP ${authPage.status})`, authPage.status);

  const loginRes = await fetch(action.replace(/&amp;/g, '&'), {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
    },
    body: new URLSearchParams({ username, password, credentialId: '' }),
  });
  const code = loginRes.headers.get('location')?.match(/[#&?]code=([^&]+)/)?.[1];
  if (!code) {
    // Keycloak answers a wrong password with 200 (the form again) — only a 5xx is worth retrying
    const status = loginRes.status >= 500 ? loginRes.status : undefined;
    throw httpError(`GRN login failed for "${username}" (HTTP ${loginRes.status}) — check GRN_USERNAME / GRN_PASSWORD in .env`, status);
  }

  const tokenRes = await fetch(`${GRN_KEYCLOAK}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, grant_type: 'authorization_code', client_id: CLIENT_ID, redirect_uri: redirectUri }),
  });
  const token = (await tokenRes.json().catch(() => ({}))).access_token;
  if (!token) throw httpError(`GRN login: no access token (HTTP ${tokenRes.status})`, tokenRes.status);

  // Confirm GRN stamps the user on every row it queues
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  return { env, cfg, token, userId: claims.preferred_username };
}

// ── HTTP helpers ────────────────────────────────────────────────────

async function call(session, method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      warehouseId: session.cfg.warehouse,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw httpError(`GRN ${method} ${url} failed: HTTP ${res.status}\n${text.slice(0, 2000)}`, res.status);
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function httpError(message, status) {
  return Object.assign(new Error(message), { status });
}

// A server-side hiccup (5xx / 429 / 408) or a dropped connection — worth trying again.
// 4xx means the request itself was wrong, which a retry won't fix.
function isTransient(err) {
  if (err.status) return err.status >= 500 || err.status === 429 || err.status === 408;
  return err instanceof TypeError; // fetch's own "fetch failed" (connection reset, DNS, …)
}

/** Runs fn again when it fails with a transient error. Only used for calls that are safe to repeat. */
async function retryOnError(what, cfg, fn, shouldRetry = isTransient) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt > cfg.retryAttempts || !shouldRetry(err)) throw err;
      console.log(`    ⚠️ ${what} failed (${err.message.split('\n')[0]}) — retry ${attempt}/${cfg.retryAttempts} in ${cfg.retryWait / 1000}s`);
      await sleep(cfg.retryWait);
    }
  }
}

/** call() for lookups and other requests that change nothing (or change it to the same thing) if repeated. */
function safeCall(session, method, url, body) {
  return retryOnError(`${method} ${new URL(url).pathname}`, session.cfg, () => call(session, method, url, body));
}

const rmUrl = (session, path) => new URL(path, URLS[session.env].GRN_RM_API).href;
const inventoryUrl = (session, path) => new URL(path, URLS[session.env].GRN_INVENTORY_API).href;

async function waitFor(what, timeout, interval, check) {
  const started = Date.now();
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() - started + interval > timeout) {
      throw new Error(`Timed out after ${Math.round(timeout / 1000)}s waiting for ${what}`);
    }
    await sleep(interval);
  }
}

// ── PL Creation ─────────────────────────────────────────────────────

/** PO lines as the PL Creation screen loads them (also carries receivedQuantity and the M3 status). */
async function getPurchaseOrder(session, poNumber) {
  return safeCall(session, 'GET', rmUrl(session, `packingList/purchaseOrder/${poNumber}`));
}

function lineQuantity(line) {
  // = "Auto Populate Order Quantity": ordered qty + supplier tolerance
  const qty = line.expectedQuantity ?? Number(line.orderedQuantity) + Number(line.tolerance || 0);
  return Math.round(Number(qty) * 1000) / 1000;
}

/**
 * Upload + Submit — one packing list line per PO line, invoice / cusdec / PL number = PO number
 * (the same values pl-creation fills in the UI). Ports PLCreationsFunc_API.uploadPackingList /
 * submitPackingList, with the payloads the current app sends.
 */
async function createPackingList(session, po) {
  const { cfg } = session;
  const poNumber = String(po.id);
  const first = po.lines[0];

  const d = String(first.planedInHouseDateIbpldt);
  const plannedInhouseDate = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  const prefix = (await safeCall(session, 'GET', rmUrl(session, 'packingList/packlistnoprefix')))?.code;
  if (!prefix) throw new Error('packlistnoprefix returned no prefix code');

  const header = {
    packingListNumber: `${prefix}-${poNumber}`,
    invoiceNumber: poNumber,
    warehouse: cfg.warehouse,
    supplierName: first.supplierNumber,
    cusdecNumber: poNumber,
    physicalGrnLocation: '',
    plannedInhouseDate,
  };

  const items = po.lines.map((line, i) => {
    const n = String(i + 1).padStart(3, '0');
    return {
      styleAttribute: line.style,
      itemCode: line.itemNumber,
      parentItemDescription: line.parentItemDescription,
      itemDescription: line.itemDescription,
      supplierQualityRef: line.supplierQualityRef,
      color: line.color,
      size: line.size,
      zFeatureDescription: line.zFeatureDescription === 'NA' ? null : line.zFeatureDescription,
      vpoNumber: line.vpoNumber,
      coo: line.coo,
      fid: line.fid,
      masterCpo: line.masterCpo,
      season: line.season,
      otherz: line.otherz,
      retailStyle: line.retailStyle,
      dateCode: line.dateCode,
      batchNo: `${cfg.batchPrefix}${n}`,
      supplierPackageId: `${cfg.supplierPkgPrefix}${n}`,
      quantity: lineQuantity(line),
      uom: line.purchaseOrderUnitOfMeasure,
      width: 0,
      uomWidth: '',
      supplierBarCode: '',
      poLine: line.purchaseOrderLine,
      poSubLine: line.purchaseOrderSubLine,
    };
  });

  // Upload — the server checks the lines against the PO and returns the packing list to submit
  const upload = await call(session, 'POST', rmUrl(session, `packingList/upload-data?poID=${poNumber}`), {
    ...header,
    poNumber,
    packingListItems: items.map(({ batchNo, quantity, width, supplierBarCode, poLine, poSubLine, ...rest }) => ({
      ...rest,
      batchNumber: batchNo,
      quantity: String(quantity),
      width: '',
      supplierBarcode: supplierBarCode,
    })),
  });
  const pl = upload?.packingListData;
  if (!pl) throw new Error(`upload-data returned no packingListData: ${JSON.stringify(upload).slice(0, 1000)}`);

  const submit = await call(session, 'POST', rmUrl(session, 'packingList/submit'), {
    warehouseId: cfg.warehouse,
    packingListNumber: pl.packingListNumber ?? header.packingListNumber,
    invoiceNumber: pl.invoiceNumber ?? poNumber,
    warehouse: pl.warehouse ?? cfg.warehouse,
    purchaseOrderNumber: pl.purchaseOrderNumber ?? poNumber,
    supplierName: pl.supplierName ?? header.supplierName,
    cusdecNumber: pl.cusdecNumber ?? poNumber,
    physicalGrnLocation: pl.physicalGrnLocation ?? '',
    plannedInhouseDate: pl.plannedInhouseDate ?? plannedInhouseDate,
    packingListItems: items,
  });
  if (submit?.statusCode >= 400) throw new Error(`packingList/submit: ${JSON.stringify(submit).slice(0, 1000)}`);
}

// ── PL Overview ─────────────────────────────────────────────────────

/** The PO's packing list as PL Overview lists it (PENDING / IN_HOUSE / IN_PROGRESS / PARTIALLY), or null. */
async function findPackingList(session, poNumber) {
  const list = await safeCall(session, 'GET', rmUrl(session, `packingList/warehouse/${session.cfg.warehouse}`));
  return (list ?? []).find((pl) => pl.poNumber === poNumber) ?? null;
}

async function markInHouse(session, plId) {
  return call(session, 'PUT', rmUrl(session, 'packingList/packingListStatusUpdate'), {
    id: plId,
    entryNo: Date.now(), // what "Auto Generate" picks in the PL Overview dialog
    state: 'IN_HOUSE',
  });
}

// ── Inventory View + scan ───────────────────────────────────────────

async function getInventoryRows(session, poNumber) {
  const res = await safeCall(session, 'POST', inventoryUrl(session, 'raw-material-inventory/filters'), {
    offset: 0,
    limit: 500,
    relations: ['inventory'],
    equals: [`inventory.warehouseId=${session.cfg.warehouse}`],
    contains: [`purchaseOrderNumber=${poNumber}`],
    model: [],
    sort: ['inventory.barcode-'],
    selects: ['inventory.barcode', 'inventory.locationName', 'purchaseOrderNumber', 'entryNumber', 'invoiceNumber', 'grnNumber', 'quantity', 'itemCode'],
    betweens: [],
  });
  return (res?.inventories ?? []).filter((row) => row.purchaseOrderNumber === poNumber);
}

/** The device scan, as one call (same endpoint as locationUpdateApi.js). Returns the barcodes that failed. */
async function updateLocation(session, barcodes) {
  const { locationId, locationName } = session.cfg;
  const res = await safeCall(session, 'PUT', inventoryUrl(session, 'raw-material-inventory/location-update'), { barcodes, locationId, locationName });
  const byBarcode = new Map((res?.results ?? []).map((r) => [r.barcode, r]));
  return barcodes
    .map((barcode) => byBarcode.get(barcode) ?? { barcode, success: false, message: 'missing from response' })
    .filter((r) => !r.success);
}

// ── Confirm GRN ─────────────────────────────────────────────────────

const GRN_STATUS = { PENDING: 0, FAILED: 1, COMPLETED: 2 };

async function getGrnRows(session, poNumber, status) {
  // warehouseId must be in the query — left empty (as the Java source sends it) the search returns nothing
  const query = new URLSearchParams({
    status: String(status), limit: '100', page: '1', poNumber, warehouseId: session.cfg.warehouse,
  });
  return (await safeCall(session, 'GET', rmUrl(session, `grn?${query}`)))?.list ?? [];
}

/**
 * "Select rows → Update M3" (action 'process', Pending tab) or "Select rows → Retry" (action
 * 'retry', Failed tab): clear this user's selection, select the rows, then queue them — the same
 * three calls Confirm GRN makes. Rows are processed asynchronously after this returns.
 *
 * Retried only when the server answers with an error (5xx): then nothing was queued. A dropped
 * connection is not retried — the rows may already be queued, and queuing them twice could
 * receive them twice in M3.
 */
async function queueGrnRows(session, rows, action) {
  const wh = session.cfg.warehouse;
  const isRetry = action === 'retry';
  const cache = (query, items) => call(session, 'POST', rmUrl(session, `grn/cache-records/${wh}?${query}`), items);

  return retryOnError(`grn/${action}`, session.cfg, async () => {
    await cache(`hard-reset=true&isCreate=false&isRetry=${isRetry}`, []);
    await cache(`hard-reset=false&isCreate=true&isRetry=${isRetry}`, rows.map((row) => ({
      id: row.id,
      cusdec: row.cusdec || row.poNumber,
      cusdecRequired: row.cusdecRequired,
      itemCode: row.itemCode,
      supplier: row.supplier,
      userId: session.userId,
    })));

    const res = await call(session, 'PUT', rmUrl(session, `grn/${action}/${wh}`));
    if (res?.statusCode >= 400) throw httpError(`grn/${action}: ${JSON.stringify(res).slice(0, 1000)}`, res.statusCode);
    return res;
  }, (err) => err.status >= 500);
}

/** M3's lowest PO status (15 approved → 50+ received), via the same lookup approvePoNumber uses. */
async function getM3PoStatus(session, poNumber) {
  const body = loadTemplate('findPurchaseOrder.json');
  body.variables.purchaseOrderNumber = poNumber;
  const result = await retryOnError('M3 PO status lookup', session.cfg, () => postGraphQL(session.env, body));
  return result?.data?.purchaseOrderFindone?.headerLowestSts ?? null;
}

// ── Whole GRN flow for a list of POs ────────────────────────────────

/**
 * Runs every PO through PL creation → Mark as In-House → scan → Confirm GRN, one phase at a
 * time across all POs (like pl-split-grn), so the server-side waits overlap. A PO that fails
 * drops out with its reason; the others carry on.
 *
 * Safe to re-run: a PO M3 already shows as received is skipped, and a PO whose packing list
 * already exists continues from that packing list instead of creating another one.
 *
 * @param {string} env
 * @param {typeof import('../../../config/grn/grnConfig').grnCfg} cfg
 * @param {string[]} poNumbers
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ poNumber: string, status: string, ok: boolean }[]>}
 */
async function grnPurchaseOrders(env, cfg, poNumbers, credentials) {
  const session = await retryOnError('GRN login', cfg, () => login(env, cfg, credentials.username, credentials.password));
  console.log(`GRN: logged in as ${session.userId}`);

  const jobs = [...new Set(poNumbers.map(String))].map((poNumber) => ({ poNumber, status: '', ok: false }));
  const log = (job, msg) => console.log(`  [${job.poNumber}] ${msg}`);

  async function phase(title, fn) {
    const active = jobs.filter((job) => !job.status);
    if (!active.length) return;
    console.log(`\n── ${title} (${active.length} PO${active.length > 1 ? 's' : ''}) ──`);
    for (const job of active) {
      try {
        await fn(job);
      } catch (err) {
        job.status = `Failed at ${title}: ${err.message.split('\n')[0]}`;
        log(job, `❌ ${err.message}`);
      }
    }
  }

  await phase('Create packing list', async (job) => {
    // Straight after approval (as in data-api) the GRN app may not have the PO yet — wait for it
    let lastError = '';
    const po = await waitFor('the PO to show in the GRN app — is it approved?', cfg.poTimeout, cfg.pollInterval, async () => {
      const found = await getPurchaseOrder(session, job.poNumber).catch((err) => {
        lastError = err.message.split('\n')[0];
        return null;
      });
      return found?.lines?.length ? found : null;
    }).catch((err) => {
      throw new Error(`${err.message}${lastError ? ` (last error: ${lastError})` : ''}`);
    });
    if (po.warehouses && !po.warehouses.includes(cfg.warehouse)) {
      throw new Error(`PO is for warehouse ${po.warehouses.join(', ')}, not ${cfg.warehouse}`);
    }
    job.lineCount = po.lines.length;

    if (po.lines.some((line) => Number(line.receivedQuantity) > 0)) {
      job.status = 'Already received — skipped';
      job.ok = true;
      log(job, `⏭️ already received in M3 (status ${po.lines[0].puslValue}) — skipped`);
      return;
    }

    job.pl = await findPackingList(session, job.poNumber);
    if (job.pl) {
      log(job, `PL ${job.pl.packingListNo} already exists (${job.pl.state}) — continuing with it`);
      return;
    }
    // Once scanned, a PL drops off the PL Overview list — but the PO still shows it as allocated
    const allocated = [...(po.poData?.cumulativePackingListAllocated ?? []), ...(po.poData?.cumulativeAllocated ?? [])];
    if (allocated.length) {
      job.pl = { state: allocated[0].state };
      log(job, `PL already exists and is past In-House (${job.pl.state}) — continuing with it`);
      return;
    }

    await createPackingList(session, po);
    job.pl = await waitFor('the new PL to show in PL Overview', cfg.plTimeout, cfg.pollInterval,
      () => findPackingList(session, job.poNumber));
    log(job, `✅ PL ${job.pl.packingListNo} created — ${job.lineCount} line(s), invoice ${job.poNumber}`);
  });

  await phase('Mark as In-House', async (job) => {
    if (job.pl.state !== 'PENDING' && job.pl.state !== 'OVERDUE') {
      log(job, `already ${job.pl.state}`);
      return;
    }
    // A failed call may still have gone through — check before trying again, so the PL is
    // never marked twice (each mark gets a new entry number)
    await retryOnError('Mark as In-House', cfg, async () => {
      try {
        await markInHouse(session, job.pl.id);
      } catch (err) {
        const pl = await findPackingList(session, job.poNumber).catch(() => null);
        if (pl && pl.state !== 'PENDING' && pl.state !== 'OVERDUE') return;
        throw err;
      }
    });
    log(job, '✅ marked In-House');
  });

  await phase('Scan', async (job) => {
    const rows = await waitFor(`${job.lineCount} barcode(s) in Inventory View`, cfg.inventoryTimeout, cfg.pollInterval, async () => {
      const found = await getInventoryRows(session, job.poNumber);
      return found.length >= job.lineCount && found.every((row) => row.inventory?.barcode) ? found : null;
    });

    const toScan = rows.filter((row) => !row.inventory.locationName).map((row) => row.inventory.barcode);
    if (toScan.length) {
      // A barcode that has only just shown up in Inventory View can still come back LOCATION_ERROR
      // for a short while — retry the failed ones (the Java source retries 10× every 5s too)
      let failed = await updateLocation(session, toScan);
      for (let attempt = 1; failed.length && attempt <= cfg.scanRetries; attempt++) {
        log(job, `${failed.length} barcode(s) not scanned yet (${failed[0].code || failed[0].message}) — retry ${attempt}/${cfg.scanRetries}`);
        await sleep(cfg.scanRetryWait);
        failed = await updateLocation(session, failed.map((f) => f.barcode));
      }
      if (failed.length) {
        throw new Error(`${failed.length} barcode(s) not scanned: ${failed.map((f) => `${f.barcode} (${[f.code, f.message].filter(Boolean).join(': ')})`).join(', ')}`);
      }
    }
    log(job, `✅ ${toScan.length} barcode(s) scanned${rows.length > toScan.length ? `, ${rows.length - toScan.length} already had a location` : ''}`);
  });

  await phase('Wait for Confirm GRN rows', async (job) => {
    job.grnRows = await waitFor(`${job.lineCount} Pending row(s) in Confirm GRN`, cfg.pendingGrnTimeout, cfg.pollInterval, async () => {
      const pending = await getGrnRows(session, job.poNumber, GRN_STATUS.PENDING);
      if (pending.length >= job.lineCount) return pending;
      // Re-run after Update M3 was already sent: nothing left to confirm
      if (!pending.length && (await getGrnRows(session, job.poNumber, GRN_STATUS.COMPLETED)).length >= job.lineCount) return [];
      return null;
    });
    log(job, job.grnRows.length ? `${job.grnRows.length} row(s) pending` : 'already confirmed — waiting for M3 only');
  });

  // One Update M3 for every PO's rows, like "Select All Pages → Update M3"
  const ready = jobs.filter((job) => !job.status && job.grnRows.length);
  if (ready.length) {
    console.log(`\n── Update M3 (${ready.length} PO${ready.length > 1 ? 's' : ''}) ──`);
    try {
      const rows = ready.flatMap((job) => job.grnRows.map((row) => ({ ...row, poNumber: job.poNumber })));
      const res = await queueGrnRows(session, rows, 'process');
      console.log(`  ✅ ${rows.length} row(s) queued${res?.message ? ` — ${res.message}` : ''}`);
    } catch (err) {
      for (const job of ready) job.status = `Failed at Update M3: ${err.message.split('\n')[0]}`;
      console.log(`  ❌ ${err.message}`);
    }
  }

  await phase('Wait for M3 receipt', async (job) => {
    // Rows go Completed once M3 accepts them; the status is read from M3 itself — the GRN app's
    // copy of it (puslValue) lags behind
    let failedRowRetries = 0;
    const m3Status = await waitFor('Confirm GRN rows to complete and M3 to show the PO as received', cfg.receiptTimeout, cfg.pollInterval, async () => {
      const failed = await getGrnRows(session, job.poNumber, GRN_STATUS.FAILED);
      if (failed.length) {
        const reasons = failed.map((r) => r.reason || r.message || JSON.stringify(r).slice(0, 300)).join(', ');
        if (failedRowRetries >= cfg.failedRowRetries) {
          throw new Error(`${failed.length} row(s) still failed in Confirm GRN after ${failedRowRetries} retr${failedRowRetries === 1 ? 'y' : 'ies'}: ${reasons}`);
        }
        // Same as the Retry button on Confirm GRN's Failed tab
        failedRowRetries++;
        log(job, `⚠️ ${failed.length} row(s) failed in Confirm GRN (${reasons}) — retry ${failedRowRetries}/${cfg.failedRowRetries}`);
        await queueGrnRows(session, failed, 'retry');
        return null;
      }
      if ((await getGrnRows(session, job.poNumber, GRN_STATUS.COMPLETED)).length < job.lineCount) return null;
      const status = await getM3PoStatus(session, job.poNumber);
      return Number(status) >= 50 ? status : null;
    });
    job.status = `GRN done (M3 status ${m3Status})`;
    job.ok = true;
    log(job, `✅ received in M3 — status ${m3Status}`);
  });

  return jobs.map(({ poNumber, status, ok }) => ({ poNumber, status, ok }));
}

module.exports = {
  login,
  getPurchaseOrder,
  createPackingList,
  findPackingList,
  markInHouse,
  getInventoryRows,
  updateLocation,
  getGrnRows,
  queueGrnRows,
  grnPurchaseOrders,
};
