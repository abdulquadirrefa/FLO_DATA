# FLO Auto

Playwright automation for Brandix's FLO / M3 / GRN landscape:

- **M3 data creation**: creates Customer Orders through Costing Approval and Scheduling & Release, either through the M3 UI (Rapid / Iron Hide login with Microsoft SSO) or directly through the GraphQL gateway, which goes on to PO creation and approval.
- **GRN (raw-material warehouse)**: PL Creation → Mark as In-House → Inventory View → scan → Confirm GRN. Runs through the GRN web app, the handheld **device** scanner UI, or the GRN backend REST APIs.
- **FLO web app**: smoke tests, Trims / Fabric Inspection, Master PO Planning (forward and reverse), plus a regression suite (TMS, WMS, …) that logs in once and reuses the session.

**Tech stack:** Node.js (CommonJS), `@playwright/test`, `dotenv`, `xlsx`.

---

## Prerequisites

- Node.js **20+** (LTS)
- Microsoft **Edge**, used by the default M3/GRN config and the device scanner window
- Google **Chrome** / Playwright Chromium, used by the FLO and regression configs
- Network access to the Brandix QA/UAT hosts

## Setup

```bash
npm ci
npx playwright install chromium

# credentials (gitignored)
cp .env.example .env                                   # then fill in the values
# per-run M3/GRN settings (gitignored)
cp config/m3/orderData.example.js config/m3/orderData.js
```

On PowerShell, use `Copy-Item` in place of `cp`. For a step-by-step walkthrough, see [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md).

---

## Project structure

```
FLO_Auto/
├── config/                      # Settings you edit before a run (no test logic)
│   ├── urls.js                  #   QA/UAT URLs: Rapid, M3, GRN app, GraphQL, GRN APIs
│   ├── flo/credentials.js       #   FLO env, base URL, login, default plant
│   ├── m3/
│   │   ├── orderData.js         #   (gitignored) env + CO values for the M3 UI flows
│   │   ├── orderData.example.js #   template for orderData.js
│   │   ├── runConfig.js         #   data-api run settings (fixed style CKF7323F4Z)
│   │   └── runConfigGeneric.js  #   data-api-generic run settings (any style)
│   └── grn/
│       ├── grnConfig.js         #   GRN API flow: warehouse, location, timeouts, retries
│       ├── plSplitData.js       #   PL line-split flow: split count, scan mode, timeouts
│       └── deviceData.js        #   device Start-screen (location) barcode
├── data/                        # Test data inputs
│   ├── flo/                     #   invoice Excel sheets, Master PO data, fabric form values
│   ├── grn/po-numbers.xlsx      #   POs processed by the GRN UI flows and approve-po
│   ├── m3/
│   │   ├── graphql-templates/   #   GraphQL request bodies (+ pop-po-templates/)
│   │   ├── co-multiple-schedule.json
│   │   └── created-data*.xlsx   #   (generated) COs/POs written by data-api runs
│   └── regression/              #   one JSON fixture per regression spec
├── src/                         # Framework code
│   ├── api/                     #   Browser-less flows
│   │   ├── graphqlClient.js     #     GraphQL gateway POST (+ sleep)
│   │   ├── m3/                  #     data-creation API flows + shared helpers
│   │   └── grn/                 #     GRN API flow, location-update (scan) API
│   ├── locators/{device,flo,grn,m3}/   # Selector factories, one per page
│   ├── pages/{device,flo,grn,m3}/      # Page Object classes
│   └── utils/                   #   paths, Excel readers/writers, result trackers,
│                                #   mobile-device launcher, failStep helper
├── tests/
│   ├── m3/                      #   M3 data creation (UI + API), session setup
│   ├── grn/                     #   GRN UI / device / API flows
│   ├── flo/                     #   FLO smoke + business flows
│   └── regression/              #   FLO regression suite (auth.setup.js + specs)
├── scripts/approve-po.js        # Standalone: approve every PO in data/grn/po-numbers.xlsx
├── docs/                        # Setup guide and Word guides
├── playwright.config.js             # Default config: tests/m3 + tests/grn (Edge, headed)
├── playwright.flo.config.js         # tests/flo (Chromium, 1 worker)
└── playwright.regression.config.js  # tests/regression (setup project + stored session)
```

## Architecture and conventions

- **Page Object Model, split in two layers.** `src/locators/<domain>/XLocators.js` exports a `buildLocators(...)` factory. `src/pages/<domain>/XPage.js` is a class that does `Object.assign(this, buildLocators(page))` and holds the actions. Selectors change in the locator file; flow steps change in the page class.
- **M3 frames.** M3 runs inside nested iframes that differ between QA and UAT. `src/pages/m3/m3Frames.js` resolves them once for every M3 page.
- **API flows** (`src/api`) call the same backends the apps use, with no browser. Specs under `tests/` only orchestrate them.
- **config vs data.** `config/` holds environment and run settings. `data/` holds inputs such as Excel sheets, JSON fixtures and GraphQL templates. Code reaches data through `src/utils/paths.js`.
- **Naming.** Specs are kebab-case (`pl-split-grn.spec.js`). Class files are PascalCase (`ConfirmGRNPage.js`). Function modules are camelCase (`grnApiFlow.js`).
- **Secrets** live only in `.env` (see `.env.example`).

---

## Running

Every command runs from the project root. M3/GRN specs pick QA or UAT from `env` in `config/m3/orderData.js`.

### M3 data creation (`playwright.config.js`)

| Command | What it does |
|---|---|
| `npm run data` / `data:headed` | Create COs through the M3 UI (`runCount` times), then costing approval and schedule release |
| `npm run co-multi` / `co-multi:headed` | Add lines + a new schedule to an existing CO (`data/m3/co-multiple-schedule.json`) |
| `npm run data-api` | Full API pipeline: CO → costing → schedules → POs → approval → release → GRN for every PO |
| `npm run data-api-generic` | Same pipeline for any style (`config/m3/runConfigGeneric.js`), without GRN |
| `npm run session` | Log into Iron Hide + M3, capture tokens, keep the browser open |
| `npm run approve-po` | Approve every PO in `data/grn/po-numbers.xlsx` (Node script) |

### GRN (`playwright.config.js`)

| Command | What it does |
|---|---|
| `npm run grn-api` | GRN through the APIs, for `$env:PO` or every PO in `data/m3/created-data.xlsx` |
| `npm run pl` / `pl:headed` | PL Creation → In-House → Inventory → device scan → Confirm GRN |
| `npm run pl-split` / `pl-split:headed` | Same flow with every PL line split into `splitCount` lines |
| `npm run grn` / `grn:headed` | Inventory → device scan → Confirm GRN for existing PLs |
| `npm run rescan` | Rescan only the unscanned barcodes of `$env:PO` (`$env:DRY_RUN=1` only counts them) |
| `npm run scan:consolidated` | Scan each PO's single consolidated barcode on the device |
| `npm run confirm:parallel` | Confirm GRN for many POs, 5 tabs at a time (`POS`, `VERIFY_ONLY`, `NO_WAIT`, …) |
| `npm run scan` / `scan:headed` | Recovery run with hard-coded barcodes (see Known issues) |

### FLO (`playwright.flo.config.js`)

| Command | What it does |
|---|---|
| `npm run smoke` / `smoke:headed` / `smoke:debug` | Run every spec in `tests/flo` (also `npm run test:flo`) |
| `npm run master-po` / `master-po:headed` | Master PO Planning, full forward flow |
| `npm run master-po-reverse` / `master-po-reverse:headed` | Master PO Planning reversal |
| `npm run trims` | Trims Inspection for every invoice in `data/flo/invoice-numbers.xlsx` |
| `npm run fabric` | Fabric Inspection for every invoice in `data/flo/fabric-invoice-numbers.xlsx` |

### Regression (`playwright.regression.config.js`)

| Command | What it does |
|---|---|
| `npm run regression` / `regression:headed` / `regression:debug` | Log in once (`auth.setup.js`), then run every regression spec |

### UI mode and reports

| Command | What it does |
|---|---|
| `npm run test:ui` / `test:flo:ui` / `test:flo-reg:ui` | Playwright UI mode for each config |
| `npm run smoke:report` / `regression:report` | Open the last HTML report |

To run a single spec directly: `npx playwright test tests/grn/grn-api.spec.js` (add `--config=…` for FLO and regression specs).

---

## Where to change run data

| To change… | Edit |
|---|---|
| QA ↔ UAT for M3/GRN | `env` in `config/m3/orderData.js` |
| QA ↔ UAT for FLO | `env` in `config/flo/credentials.js` |
| CO values for the M3 UI flow (style, colours, run count) | `config/m3/orderData.js` |
| Existing CO for the multi-schedule flow | `data/m3/co-multiple-schedule.json` |
| API data creation settings | `config/m3/runConfig.js` / `config/m3/runConfigGeneric.js` |
| POs for the GRN UI flows | `data/grn/po-numbers.xlsx` |
| GRN API waits / retries / location | `config/grn/grnConfig.js` |
| PL split count, scan mode, stop point | `config/grn/plSplitData.js` |
| Device start (location) barcode | `config/grn/deviceData.js` |
| Trims / Fabric invoices | `data/flo/invoice-numbers.xlsx` / `data/flo/fabric-invoice-numbers.xlsx` |
| Fabric Inspection form values | `data/flo/fabricInspectionData.js` |
| Master PO forward / reverse data | `data/flo/masterPOData.js` / `data/flo/masterPOReverseData.js` |
| Regression inputs | `data/regression/*.data.json` |
| URLs | `config/urls.js` |

## Reports and artifacts

| Path | Contents |
|---|---|
| `playwright-report/` | HTML report from the last run (`npm run smoke:report`) |
| `test-results/` | Screenshots, videos and traces of failed tests |
| `playwright/.auth/` | Stored FLO session (`flo.json`) and captured M3 tokens |
| `data/m3/created-data*.xlsx` | COs/POs created by `data-api` runs, plus GRN status. `grn-api` reads this |
| `downloads/consolidated-barcodes/` | Consolidated barcode PDFs from `pl-split` |

All of these are gitignored.

---

## Known issues

These existed before the restructure. They are flagged here and have not been changed.

1. **Hard-coded FLO password** in `config/flo/credentials.js`. It should move to `.env` (for example `FLO_USERNAME` / `FLO_PASSWORD`), and the password should be rotated because it is in git history.
2. `tests/grn/scan-and-confirm.spec.js` calls `confirmGRN.selectAllRowsViaHeaderCheckbox()`, which does not exist on `ConfirmGRNPage`. The Confirm GRN step fails at runtime.
3. `FloLoginPage.isLoginSuccessful()` and the login step of `tests/flo/master-po-reverse.spec.js` hard-code the `flo.uat.brandixlk.org` hostname, so they fail when `env` is `QA`.
4. `.github/workflows/playwright.yml` runs `npx playwright test` on Ubuntu. These suites need headed Edge, the internal network, `.env` and `orderData.js`, so the workflow cannot pass as written.
5. `docs/*.docx` still describe the old folder layout. `docs/SETUP_GUIDE.md` and this README are current.
