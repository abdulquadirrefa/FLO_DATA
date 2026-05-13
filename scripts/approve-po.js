process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { readPONumbers } = require('../config/m3/readPONumbers');

const ENDPOINT = 'https://rapid.uat.brandixlk.org/public-graphql-federation-gateway/graphql';

const COMPANY  = '200';
const USER_ID  = 'CHAMIKAP';
const STATUS   = 'APPROVED';

async function approvePO(poNumber) {
  const query = `
    query APPROVE_PO {
      changePurchaseOrderApproveStatus(
        args: {
          company: "${COMPANY}"
          purchaseOrderNumber: "${poNumber}"
          approveStatus: ${STATUS}
          userId: "${USER_ID}"
        }
      ) {
        status
        message
      }
    }
  `;

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Unauthorized': 'true',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function main() {
  const poNumbers = readPONumbers();

  if (poNumbers.length === 0) {
    console.log('No PO numbers found in the Excel sheet.');
    return;
  }

  console.log(`\nApproving ${poNumbers.length} PO(s)...\n`);

  for (const po of poNumbers) {
    try {
      const result = await approvePO(po);
      const data = result?.data?.changePurchaseOrderApproveStatus;
      console.log(`[${po}] ${data?.status ?? 'NO STATUS'} — ${data?.message ?? JSON.stringify(result)}`);
    } catch (err) {
      const cause = err.cause?.message ?? err.cause?.code ?? '';
      console.error(`[${po}] ERROR — ${err.message}${cause ? ` (${cause})` : ''}`);
    }
  }

  console.log('\nDone.');
}

main();
