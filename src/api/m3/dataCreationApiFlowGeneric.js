// Generic (any-style) variant of dataCreationApiFlow.js. Does NOT modify that
// file — it reuses its already style-agnostic stage functions (costing
// approval, scheduling, PO-number retrieval, PO approval, schedule release)
// and only re-implements the three stages that were hardcoded to a single
// style/BOM: CO header creation, CO line creation, and PO creation.
const { postGraphQL, sleep } = require('../graphqlClient');
const { searchPopLines } = require('./dataCreationApiFlow');
const {
  loadTemplate,
  loadPoTemplate,
  formatDateYMD,
  formatDateCompact,
  futureDate,
  randomInt,
} = require('./flowHelpers');

// Used only as a read-only source for the createPOPPurchaseOrders mutation's
// query string and its style-independent envelope fields (userId/viewType/
// notificationSettings) — never mutated, never written back.
const PO_ENVELOPE_DONOR = 'aggregateViewB02ForFirstSchedule.json';

// ── CO SDK (generic) ────────────────────────────────────────────────

async function createCoHeaderGeneric(env, cfg) {
  const body = loadTemplate('customerHeader.json');
  const input = body.variables.input;

  input.company = cfg.company;
  input.division = cfg.division;
  input.facility = cfg.facility;
  input.invoiceRecipient = cfg.invoiceRecipient;
  input.style = cfg.style;
  input.retailStyle = cfg.retailStyle;
  input.customerStyle = cfg.customerStyle;
  input.customer = cfg.customer;
  input.payer = cfg.payer;
  input.coResponsible = cfg.coResponsible;
  input.cpo = cfg.cpo;
  input.buyName = cfg.buyName;
  input.prodWarehouse = cfg.warehouse;
  input.season = cfg.season;

  input.vpoNo = String(randomInt(1, 99999999));
  const today = new Date();
  input.orderDate = formatDateYMD(today);
  input.customerOrderDate = formatDateYMD(today);
  input.requestedDeliveryDate = formatDateYMD(futureDate(0, 1, 0));

  const result = await postGraphQL(env, body);
  const coNumber = result?.data?.createCustomerOrderHeader?.orderHeader?.coNumber;
  if (!coNumber) {
    throw new Error(`createCoHeaderGeneric: no coNumber in response ${JSON.stringify(result)}`);
  }
  return coNumber;
}

async function createCoLinesGeneric(env, cfg, coNumber) {
  const body = loadTemplate('coExcelLineCreation.json');
  const input = body.variables.input;
  input.orderNumber = coNumber;
  input.style = cfg.style;

  const vpoBase = `${randomInt(1, 999999)}SF`;
  const planDate = formatDateCompact(futureDate(0, 1, 0));
  const reqDelDate = formatDateCompact(futureDate(1, 1, 0));
  const currentDate = formatDateCompact(new Date());

  let scheduleDivider = 1;
  let vpoIteration;

  input.lines = cfg.lines.map((line, i) => {
    const built = {
      ...line,
      reqDelDate,
      planDelDate: planDate,
      fobDate: reqDelDate,
      ndcDate: reqDelDate,
      pcdDate: currentDate,
    };

    if (cfg.lines.length > 3) {
      if (i === 0 || i === 8 || i === 16) {
        vpoIteration = vpoBase + scheduleDivider;
        scheduleDivider++;
      }
    } else {
      vpoIteration = vpoBase + scheduleDivider;
      scheduleDivider++;
    }
    built.vpoNo = vpoIteration;
    return built;
  });

  await postGraphQL(env, body);

  const waitMs = input.lines.length > 8 ? 480000 : input.lines.length > 3 ? 160000 : 60000;
  await sleep(waitMs);
}

// ── POP SDK (generic PO creation) ──────────────────────────────────

/**
 * Style-agnostic PO creation: instead of cross-referencing a static per-style
 * sample file (as dataCreationApiFlow.js's createPurchaseOrders does), this
 * builds the aggregateView[] line list ENTIRELY from the live POP-line-search
 * response — so it works for any style/schedule/procurement-group combo with
 * no pre-captured sample data required.
 *
 * poQty/adjustedPoQuantity/popQty are computed from the live item's own
 * demandQuantity and conversionFactor fields (standard UOM-conversion
 * semantics), matching the intent of the Java codebase's unused
 * `createPOInUAT` method — but corrected: that method had a bug reading the
 * `id` field in place of `conversionFactor` and sent its computed values under
 * a `lines` variable that doesn't match the mutation's declared `$aggregateView`
 * argument, so it isn't safe to port as-is.
 */
async function createPurchaseOrdersGeneric(env, cfg, scheduleNo, itemType, procurementGroups, searchResponse) {
  const donor = loadPoTemplate(PO_ENVELOPE_DONOR);

  const liveItems = searchResponse?.data?.getAggregateViewData?.purchaseOrderAggregateView ?? [];
  const cacheKey = searchResponse?.data?.getAggregateViewData?.cacheKey;

  if (liveItems.length === 0) {
    console.warn(`createPurchaseOrdersGeneric: no live POP lines for schedule ${scheduleNo} / ${itemType} / ${procurementGroups.join(',')} — nothing to create`);
    return { itemCodes: [] };
  }

  const aggregateView = liveItems.map((item) => {
    const conversionFactor = Number(item.conversionFactor) || 0;
    const demand = Number(item.demandQuantity ?? item.originalDemandQuantity ?? 0);
    const poQty = conversionFactor !== 0 ? demand / conversionFactor : demand;

    return {
      ...item,
      schedule: Number(scheduleNo),
      poQty,
      adjustedPoQuantity: poQty,
      popQty: demand,
      stock: Number(item.stock) || 0,
      reasonCode: '',
    };
  });

  const body = {
    variables: {
      company: Number(cfg.company),
      userId: donor.variables.userId,
      viewType: donor.variables.viewType,
      notificationSettings: donor.variables.notificationSettings,
      cacheKey,
      aggregateView,
    },
    query: donor.query,
  };

  await sleep(20000); // mandatory wait, matches the original flow

  let response = await postGraphQL(env, body);

  for (let i = 0; i < 24; i++) {
    const message = response?.data?.createPOPPurchaseOrders?.message;

    if (message == null) {
      response = await postGraphQL(env, body);
      continue;
    }

    if (String(message).includes('Your PO lock has expired.')) {
      console.log(`PO lock expired for schedule ${scheduleNo}, re-searching and retrying`);
      const freshSearch = await searchPopLines(env, cfg, scheduleNo, itemType, procurementGroups);
      return createPurchaseOrdersGeneric(env, cfg, scheduleNo, itemType, procurementGroups, freshSearch);
    }

    if (!String(message).includes('Your request has been submitted for processing')) {
      throw new Error(`createPurchaseOrdersGeneric: unexpected message "${message}"`);
    }
    break;
  }

  return { itemCodes: aggregateView.map((item) => item.itemCode) };
}

module.exports = {
  createCoHeaderGeneric,
  createCoLinesGeneric,
  createPurchaseOrdersGeneric,
};
