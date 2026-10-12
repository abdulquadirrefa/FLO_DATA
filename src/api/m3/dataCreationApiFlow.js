// API port of TCSFCS01A_AutomationDataCreationWorkFlow_API.java — CO creation through
// PO approval and schedule release, as direct GraphQL calls (no browser). The request
// bodies are the templates in data/m3/graphql-templates/, all wired to style CKF7323F4Z
// (see config/m3/runConfig.js). Long mandatory waits are ported 1:1 from the Java source.
const { postGraphQL, sleep } = require('../graphqlClient');
const {
  loadTemplate,
  loadPoTemplate,
  formatDateYMD,
  formatDateCompact,
  futureDate,
  randomInt,
} = require('./flowHelpers');

// ── CO SDK ──────────────────────────────────────────────────────────

async function createCoHeader(env, cfg) {
  const body = loadTemplate('customerHeader.json');
  const input = body.variables.input;

  input.vpoNo = String(randomInt(1, 99999999));
  const today = new Date();
  input.orderDate = formatDateYMD(today);
  input.customerOrderDate = formatDateYMD(today);
  input.requestedDeliveryDate = formatDateYMD(futureDate(0, 1, 0));

  const result = await postGraphQL(env, body);
  const coNumber = result?.data?.createCustomerOrderHeader?.orderHeader?.coNumber;
  if (!coNumber) {
    throw new Error(`createCoHeader: no coNumber in response ${JSON.stringify(result)}`);
  }
  return coNumber;
}

async function createCoLines(env, cfg, coNumber) {
  const body = loadTemplate('coExcelLineCreation.json');
  const input = body.variables.input;
  input.orderNumber = coNumber;

  const vpoBase = `${randomInt(1, 999999)}SF`;
  const planDate = formatDateCompact(futureDate(0, 1, 0));
  const reqDelDate = formatDateCompact(futureDate(1, 1, 0));
  const currentDate = formatDateCompact(new Date());

  const lines = input.lines;
  let scheduleDivider = 1;
  let vpoIteration;

  lines.forEach((line, i) => {
    line.reqDelDate = reqDelDate;
    line.planDelDate = planDate;
    line.fobDate = reqDelDate;
    line.ndcDate = reqDelDate;
    line.pcdDate = currentDate;

    if (lines.length > 3) {
      if (i === 0 || i === 8 || i === 16) {
        vpoIteration = vpoBase + scheduleDivider;
        scheduleDivider++;
      }
    } else {
      vpoIteration = vpoBase + scheduleDivider;
      scheduleDivider++;
    }
    line.vpoNo = vpoIteration;
  });

  await postGraphQL(env, body);

  const waitMs = lines.length > 8 ? 480000 : lines.length > 3 ? 160000 : 60000;
  await sleep(waitMs);
}

async function releaseForCosting(env, cfg, coNumber) {
  const body = loadTemplate('coReleaseForCosting.json');
  body.variables.orderNumber = coNumber;

  const result = await postGraphQL(env, body);
  if (result?.data?.setCOLineSubmitStatus !== 'OK') {
    throw new Error(`releaseForCosting: unexpected response ${JSON.stringify(result)}`);
  }

  await sleep(180000);
}

// ── Costing SDK ─────────────────────────────────────────────────────

async function approveCostingForCo(env, cfg, coNumber) {
  const searchBody = loadTemplate('getNonApprovedCustomerOrders.json');
  searchBody.variables.summaryViewInputArgs.customerOrderNumber = coNumber;
  searchBody.variables.summaryViewInputArgs.style = cfg.style;

  let searchResult = await postGraphQL(env, searchBody);
  let recordsCount = searchResult?.data?.getSummaryDetails?.total ?? 0;

  for (let i = 0; i < 5 && recordsCount < 1; i++) {
    await sleep(120000);
    searchResult = await postGraphQL(env, searchBody);
    recordsCount = searchResult?.data?.getSummaryDetails?.total ?? 0;
  }

  const records = searchResult?.data?.getSummaryDetails?.data ?? [];
  if (records.length === 0) {
    throw new Error(
      `approveCostingForCo: no costing records for CO ${coNumber} / style ${cfg.style} — ` +
      `check the style matches the CO templates. Last response: ${JSON.stringify(searchResult)}`
    );
  }

  const fieldTemplate = loadTemplate('approveCostingFieldTemplate.json');
  const fieldNames = Object.keys(fieldTemplate.variables.updateApproveCostingInput[0]);

  const filtered = records.map((record) => {
    const out = {};
    for (const field of fieldNames) {
      if (!(field in record)) continue;
      if (field === 'approvalStatus') {
        out[field] = '1';
      } else if (field === 'approvedBy') {
        out[field] = cfg.adminUsername;
      } else {
        out[field] = record[field];
      }
    }
    return out;
  });

  const approveBody = loadTemplate('approveCostingFieldTemplate.json');
  approveBody.variables.updateApproveCostingInput = filtered;

  const approveResult = await postGraphQL(env, approveBody);
  console.log(`Costing approval response: ${JSON.stringify(approveResult)}`);

  await sleep(60000); // AUTO data-creation type wait (Java also has a 450s MANUAL branch, unused here)
}

// ── Scheduling & Release SDK ────────────────────────────────────────

async function addSchedule(env, cfg, coNumber) {
  const body = loadTemplate('addSchedule.json');
  body.variables.queryData.co = coNumber;

  const result = await postGraphQL(env, body);
  if (result?.data?.addScheduleNo?.status !== 'success') {
    throw new Error(`addSchedule: unexpected response ${JSON.stringify(result)}`);
  }

  await sleep(80000);
}

async function searchSchedules(env, cfg, coNumber) {
  const body = loadTemplate('schedulingSearch.json');
  body.variables.co = coNumber;
  body.variables.style = cfg.style;

  let schedules = [];
  for (let i = 0; i < 10; i++) {
    const result = await postGraphQL(env, body);
    schedules = result?.data?.getAllScheduleNumbersAddRelease ?? [];
    if (schedules.length === cfg.expectedScheduleCount) break;
    await sleep(10000);
  }

  if (schedules.length === 0) {
    throw new Error(`searchSchedules: no schedules found for CO ${coNumber} / style ${cfg.style}`);
  }
  return schedules.map((s) => String(s.scheduleNumber)).sort();
}

async function releaseScheduleNo(env, cfg, coNumber, scheduleNo) {
  const body = loadTemplate('releaseSchedule.json');
  body.variables.queryData.co = coNumber;
  body.variables.queryData.scheduleNo = Number(scheduleNo);

  const result = await postGraphQL(env, body);
  if (result?.data?.addScheduleNo?.status !== 'success') {
    throw new Error(`releaseScheduleNo ${scheduleNo}: unexpected response ${JSON.stringify(result)}`);
  }
}

// ── POP SDK ─────────────────────────────────────────────────────────

async function searchPopLines(env, cfg, scheduleNo, itemType, procurementGroups) {
  const body = loadTemplate('popLineSearch.json');
  body.variables.warehouses[0] = cfg.warehouse;
  body.variables.buyerDevisions[0] = cfg.buyerDivision;
  body.variables.styles[0] = cfg.style;
  body.variables.itemTypes[0] = itemType;
  body.variables.schedule = Number(scheduleNo);
  body.variables.procumentGroups = [...procurementGroups];

  return postGraphQL(env, body);
}

/**
 * Ports POPSDKFunc_API.createPO (the method the Java test actually calls, not
 * the unused createPOInUAT): loads the static per-schedule/logic-row sample
 * file, cross-references its itemCodes against the LIVE search response to
 * stamp id/customerOrder/minimumPCD/expectedIHDate/exMillDate/popReleaseDate/
 * validFromDate/schedule onto each line, then posts the old
 * createPOPPurchaseOrders(aggregateView, ...) mutation — the shape every
 * committed sample file under pop-po-templates/ actually uses.
 */
async function createPurchaseOrders(env, cfg, scheduleNo, itemType, procurementGroups, templateFileName, searchResponse) {
  const body = loadPoTemplate(templateFileName);
  const aggregateView = body.variables.aggregateView;

  const cacheKey = searchResponse?.data?.getAggregateViewData?.cacheKey;
  body.variables.cacheKey = cacheKey;

  const liveItems = searchResponse?.data?.getAggregateViewData?.purchaseOrderAggregateView ?? [];
  // An empty search has a null cacheKey, and the mutation's $cacheKey is String! — the gateway rejects it with a bare HTTP 400.
  if (liveItems.length === 0 || !cacheKey) {
    throw new Error(
      `createPurchaseOrders: POP search returned no lines for schedule ${scheduleNo} / ${itemType} / ${procurementGroups.join(',')} ` +
      `(style ${cfg.style}, buyer division ${cfg.buyerDivision}, warehouse ${cfg.warehouse}) — check those values match the CO. ` +
      `Response: ${JSON.stringify(searchResponse).slice(0, 1000)}`
    );
  }
  const liveByItemCode = new Map(liveItems.map((item) => [String(item.itemCode).trim(), item]));

  const itemCodes = aggregateView.map((item) => item.itemCode);

  for (const item of aggregateView) {
    const live = liveByItemCode.get(String(item.itemCode).trim());
    if (!live) {
      console.warn(`createPurchaseOrders: itemCode ${item.itemCode} from ${templateFileName} not found in live POP search response — leaving stale sample values in place`);
      continue;
    }
    item.id = live.id;
    item.customerOrder = live.customerOrder;
    item.minimumPCD = live.minimumPCD;
    item.expectedIHDate = live.expectedIHDate;
    item.exMillDate = live.exMillDate;
    item.popReleaseDate = live.popReleaseDate;
    item.validFromDate = live.validFromDate;
    item.schedule = Number(scheduleNo);
  }

  await sleep(20000); // mandatory wait, matches Java

  let response = await postGraphQL(env, body);

  for (let i = 0; i < 24; i++) {
    const message = response?.data?.createPOPPurchaseOrders?.message;

    if (message == null) {
      response = await postGraphQL(env, body);
      continue;
    }

    if (String(message).includes('Your PO lock has expired.')) {
      console.log(`PO lock expired for ${templateFileName}, re-searching and retrying`);
      const freshSearch = await searchPopLines(env, cfg, scheduleNo, itemType, procurementGroups);
      return createPurchaseOrders(env, cfg, scheduleNo, itemType, procurementGroups, templateFileName, freshSearch);
    }

    if (!String(message).includes('Your request has been submitted for processing')) {
      throw new Error(`createPurchaseOrders: unexpected message "${message}"`);
    }
    break;
  }

  return { itemCodes };
}

// ── Pre-allocation interface ────────────────────────────────────────

async function getCreatedPoNumber(env, cfg, scheduleNo, itemCode) {
  const body = loadTemplate('getPoNumbers.json');
  body.variables.warehouses[0] = cfg.warehouse;
  body.variables.schedules[0] = String(scheduleNo);
  body.variables.itemNumber = itemCode;

  let response = await postGraphQL(env, body);

  const readMopSupply = (r) =>
    r?.data?.getDemandOrderDetailsForMOPs?.[0]?.materialPlansForMOPs?.preAllocationByOrderNumber?.supplyOrd ?? null;
  const readMoSupply = (r) =>
    r?.data?.getDemandOrderDetailsForMOs?.[0]?.materialPlansForMOs?.preAllocationByOrderNumber?.supplyOrd ?? null;

  let supply = readMopSupply(response);
  for (let i = 0; i < 150 && supply == null; i++) {
    await sleep(5000);
    response = await postGraphQL(env, body);
    supply = readMopSupply(response);
  }
  if (supply != null) return supply;

  // Fallback path (matches Java's catch block): poll the ...MOs shape instead.
  supply = readMoSupply(response);
  for (let i = 0; i < 24 && supply == null; i++) {
    await sleep(5000);
    response = await postGraphQL(env, body);
    supply = readMoSupply(response);
  }

  return supply;
}

// ── PO SDK ──────────────────────────────────────────────────────────

async function approvePoNumber(env, cfg, poNumber) {
  const findBody = loadTemplate('findPurchaseOrder.json');
  findBody.variables.purchaseOrderNumber = poNumber;

  let findResult = await postGraphQL(env, findBody);
  let status = findResult?.data?.purchaseOrderFindone?.headerLowestSts;

  if (Number(status) >= 15) {
    console.log(`PO ${poNumber} is already approved (status ${status})`);
    return;
  }

  const approveBody = loadTemplate('approvePurchaseOrder.json');
  approveBody.variables.args.purchaseOrderNumber = poNumber;
  approveBody.variables.args.userId = cfg.poApprovalUserId;

  await postGraphQL(env, approveBody);
  await sleep(5000);

  findResult = await postGraphQL(env, findBody);
  status = findResult?.data?.purchaseOrderFindone?.headerLowestSts;

  for (let i = 0; i < 33 && status !== '15'; i++) {
    await sleep(5000);
    findResult = await postGraphQL(env, findBody);
    status = findResult?.data?.purchaseOrderFindone?.headerLowestSts;
  }

  if (status !== '15') {
    throw new Error(`PO ${poNumber} was not approved — final status ${status}`);
  }
}

module.exports = {
  createCoHeader,
  createCoLines,
  releaseForCosting,
  approveCostingForCo,
  addSchedule,
  searchSchedules,
  releaseScheduleNo,
  searchPopLines,
  createPurchaseOrders,
  getCreatedPoNumber,
  approvePoNumber,
};
