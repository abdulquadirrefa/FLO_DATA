// Application and API base URLs per environment ('QA' | 'UAT') — Rapid, M3, GRN app,
// GraphQL gateway and the GRN backend services. Pick the env via config/m3/orderData.js.
const URLS = {
  QA: {
    RAPID:    'https://rapid.qa.brandixlk.org/security-ironhide-app/company',
    M3:       'https://erp-qa-m3-iso-ec2.brandixlk.org:24012/mne/infor?HybridCertified=1&OnPremCertified=1&Responsive=All&xfo=https%3a%2f%2ferp-qa-m3-ui-ec2.brandixlk.org&LogicalId=lid%3A%2F%2Finfor.m3.qa&inforThemeName=Light&inforCurrentLocale=en-US&inforCurrentLanguage=en-US&infor10WorkspaceShell=1&inforWorkspaceVersion=2020-06&inforStyle=3.0&inforTimeZone=(UTC%2B05%3A30)%20Chennai%2C%20Kolkata%2C%20Mumbai%2C%20New%20Delhi&inforStdTimeZone=Asia%2FKolkata',
    GRN:      'https://grn.flo.qa.brandixlk.org/',
    // NOTE: assumed to mirror the UAT gateway path on the QA host — the Java
    // source only ever exercised the UAT endpoint (RequestedURLConstants.QARequestURL
    // actually points at rapid.uat.*), so this QA path is unconfirmed. Correct if wrong.
    GRAPHQL:  'https://rapid.qa.brandixlk.org/public-graphql-federation-gateway/graphql',
    // NOTE: assumed to follow the UAT naming on the QA host — only the UAT GRN
    // services were checked (grnApiFlow.js). Correct if wrong.
    GRN_KEYCLOAK:      'https://grn-keycloak.flo.qa.brandixlk.org/auth/realms/sfcs/protocol/openid-connect',
    GRN_RM_API:        'https://grn-raw-materials.flo.qa.brandixlk.org/',
    GRN_INVENTORY_API: 'https://grn-inventory.flo.qa.brandixlk.org/',
  },
  UAT: {
    RAPID:    'https://rapid.uat.brandixlk.org/security-ironhide-app/company',
    M3:       'https://sin1auwm3ui001.brandixlk.org/infor/a2cdf75a-1d96-43d0-95c5-25163fb8a228',
    GRN:      'https://grn.flo.uat.brandixlk.org/raw-material/inventory/inventory-view',
    GRAPHQL:  'https://rapid.uat.brandixlk.org/public-graphql-federation-gateway/graphql',
    // GRN app backend (same services the GRN web app calls — see its env-config.js)
    GRN_KEYCLOAK:      'https://grn-keycloak.flo.uat.brandixlk.org/auth/realms/sfcs/protocol/openid-connect',
    GRN_RM_API:        'https://grn-raw-materials.flo.uat.brandixlk.org/',
    GRN_INVENTORY_API: 'https://grn-inventory.flo.uat.brandixlk.org/',
  },
};

module.exports = { URLS };
