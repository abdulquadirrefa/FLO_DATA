const { URLS } = require('../../config/urls');

// Matches scripts/approve-po.js — the UAT gateway's cert isn't trusted by Node by default.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST a GraphQL body to the env's gateway.
 * Unauthenticated by design — matches the Java source (TCSFCS01A), which sends
 * an empty access token and relies on the gateway accepting `Unauthorized: true`
 * with no bearer token at all.
 */
async function postGraphQL(env, body) {
  const url = URLS[env].GRAPHQL;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Unauthorized: 'true',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw Object.assign(
      new Error(`GraphQL POST ${url} failed: HTTP ${response.status} ${response.statusText}\n${detail.slice(0, 2000)}`),
      { status: response.status } // lets callers tell a 5xx (worth retrying) from a bad request
    );
  }

  return response.json();
}

module.exports = { postGraphQL, sleep };
