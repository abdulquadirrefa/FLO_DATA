# FLO Auto — Setup & Execution Guide

This guide takes you through setting up the project for the first time and running the automation scripts. For the folder layout, the conventions and the full list of commands, see the [README](../README.md).

---

## What you need to install

### 1. Node.js (version 20 or higher)
- Download the **LTS** version from https://nodejs.org and run the installer.
- Check it installed correctly:
  ```
  node --version
  ```
  The output should look like `v20.x.x` or higher.

### 2. Git
- Download from https://git-scm.com/downloads. The default installer options are fine.
- Check it installed correctly:
  ```
  git --version
  ```

### 3. Browsers
- **Microsoft Edge**: the M3 and GRN scripts run in Edge, and so does the handheld "device" scanner window. Edge comes with Windows.
- **Google Chrome**: download from https://www.google.com/chrome. The FLO scripts run in Chrome/Chromium.

> You do **not** need to install Playwright separately. The next steps install it.

You also need network access to the Brandix QA/UAT systems (office network or VPN).

---

## Step 1 — Get the project

Open a terminal (PowerShell on Windows) and run:

```bash
git clone https://github.com/abdulquadirrefa/FLO_DATA.git
cd FLO_DATA
```

---

## Step 2 — Install dependencies

```bash
npm ci
npx playwright install chromium
```

The first command installs the packages (Playwright, dotenv, xlsx). The second installs the Chromium browser that Playwright uses.

---

## Step 3 — Set up credentials (`.env`)

Logins are stored in a `.env` file in the project root. Git ignores this file, so it never gets committed. The project includes a template, `.env.example`. Copy it:

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in each value:

| Keys | Used for |
|---|---|
| `UAT_EMAIL`, `UAT_PASSWORD` / `QA_EMAIL`, `QA_PASSWORD` | Microsoft login for Rapid (Iron Hide) and M3 |
| `GRN_USERNAME`, `GRN_PASSWORD` | GRN raw-material web app and the GRN API flow |
| `DEVICE_USERNAME`, `DEVICE_PASSWORD` | GRN handheld device (scanner) login |
| `SCAN_API_TOKEN` | Optional. Only needed when the location-update API can't take a token from the app |

If you don't have these credentials, ask the project owner.

---

## Step 4 — Set up the run settings (`config/m3/orderData.js`)

Every M3 and GRN script reads `config/m3/orderData.js`. Git ignores this file too, so each person keeps their own copy. Create it from the template:

```powershell
Copy-Item config/m3/orderData.example.js config/m3/orderData.js
```

Open it and set:

- `env`: `'QA'` or `'UAT'`. This selects the URLs (from `config/urls.js`) and the matching logins (from `.env`).
- The fields marked **← Change** (style, buyer division, colours, run count) for the M3 data-creation UI flow.

## Step 5 — FLO settings (`config/flo/credentials.js`)

The FLO scripts use `config/flo/credentials.js`. It sets the environment (`env: 'QA' | 'UAT'`), the login and the default plant. Update it if your FLO login is different.

> This file currently stores the FLO password in plain text. Moving it into `.env` is on the README's *Known issues* list.

---

## Running the scripts

Run every command from the project root. Common ones:

| Command | What it does |
|---|---|
| `npm run data:headed` | Create Customer Orders in M3 through the UI (watch it run) |
| `npm run data-api` | Create CO → POs through the APIs, then GRN every PO (no browser) |
| `npm run grn-api` | GRN existing POs through the APIs |
| `npm run pl:headed` | GRN through the GRN web app + device scanner for the POs in `data/grn/po-numbers.xlsx` |
| `npm run smoke:headed` | FLO smoke tests |
| `npm run master-po:headed` | FLO Master PO Planning, forward flow |
| `npm run regression:headed` | FLO regression suite |
| `npm run smoke:report` | Open the HTML report from the last run |

The README lists every command and every file you can edit for a run.

### Watching a run
Add `:headed` (where it's available) to see the browser. When a run finishes, the terminal prints a summary, for example the CO and schedule numbers, or the GRN status per PO.

---

## Switching between QA and UAT

| Area | Where |
|---|---|
| M3 and GRN scripts | `env` in `config/m3/orderData.js` |
| FLO scripts | `env` in `config/flo/credentials.js` |
| API data creation (generic style) | `env` in `config/m3/runConfigGeneric.js` |

The URLs for both environments are in `config/urls.js`.

---

## Common issues

**"Cannot find module …/config/m3/orderData"**
You haven't created your local `orderData.js` yet. See Step 4.

**"Cannot find module" for a package**
Run `npm ci` again.

**"Executable doesn't exist" / browser not found**
Run `npx playwright install chromium`. For the Edge-based scripts, make sure Microsoft Edge is installed.

**Login fails or an MFA prompt appears**
The M3 scripts go through Microsoft login with MFA. Approve the request in Microsoft Authenticator. The script prints the number to tap and waits up to 90 seconds.

**A test times out**
QA/UAT can be slow. Check your network or VPN connection and try again. The long waits in the API flows are deliberate; a full `data-api` run can take more than an hour.
