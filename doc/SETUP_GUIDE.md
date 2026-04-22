# FLO Auto — Setup & Execution Guide

A step-by-step guide for anyone setting up this project for the first time and running the automation scripts.

---

## What You Need to Install

### 1. Node.js
The automation runs on Node.js. You need version **18 or higher**.

- Download from: https://nodejs.org
- Choose the **LTS** version (recommended)
- Run the installer and follow the prompts
- To verify it installed correctly, open a terminal and run:
  ```
  node --version
  ```
  You should see something like `v20.x.x`

### 2. Git
Used to download (clone) the project from GitHub.

- Download from: https://git-scm.com/downloads
- Run the installer (default options are fine)
- To verify:
  ```
  git --version
  ```

### 3. Google Chrome
The tests run in a Chrome browser window. Make sure Chrome is installed on your machine.

- Download from: https://www.google.com/chrome

> **Note:** You do NOT need to install Playwright or any other tools separately — they are installed automatically in the next steps.

---

## Step 1 — Get the Project

Open a terminal (Command Prompt or PowerShell on Windows) and run:

```bash
git clone https://github.com/abdulquadirrefa/FLO_DATA.git
```

This will download the project into a folder called `FLO_DATA`. Navigate into it:

```bash
cd FLO_DATA
```

---

## Step 2 — Install Dependencies

Inside the project folder, run:

```bash
npm install
```

This installs all required packages (Playwright, dotenv, etc.). It may take a minute.

Then install the Playwright browser (Chrome):

```bash
npx playwright install chromium
```

---

## Step 3 — Set Up Credentials

The project uses a `.env` file to store login credentials. This file is **not** included in the repository (for security), so you need to create it manually.

In the root of the project folder, create a new file named `.env` (no extension) and add the following:

```
# UAT credentials (M3 / Rapid)
UAT_EMAIL=your_uat_username
UAT_PASSWORD=your_uat_password

# QA credentials (M3 / Rapid)
QA_EMAIL=your_qa_username
QA_PASSWORD=your_qa_password

# GRN credentials
GRN_USERNAME=your_grn_username
GRN_PASSWORD=your_grn_password

# Device credentials
DEVICE_USERNAME=your_device_username
DEVICE_PASSWORD=your_device_password
```

Replace each `your_...` value with the actual credentials. Ask the project owner if you do not have them.

---

## Step 4 — Set Up FLO Smoke Credentials

The FLO smoke tests use a separate credentials file. Open this file:

```
flo-smoke/config/credentials.js
```

Update the values inside to match your FLO UAT login:

```js
const FLO_CONFIG = {
  baseURL:  'https://flo.uat.brandixlk.org/',
  email:    'your_username',
  password: 'your_password',
};
```

---

## Step 5 — Configure the Environment

Before running the M3 data creation script, open:

```
config/orderData.js
```

At the top you will see:

```js
env: 'QA',   // ← change to 'UAT' to use UAT environment
```

Set this to either `'QA'` or `'UAT'` depending on which environment you want to run against.

Also update the other fields in that file to match the data you want to create (style, facility, etc.).

---

## Running the Scripts

All scripts are run from the terminal inside the project folder.

### FLO Smoke Tests

These test the FLO UAT application (Master PO Planning flow).

| Command | What it does |
|---|---|
| `npm run smoke` | Run all smoke tests (no browser window) |
| `npm run smoke:headed` | Run all smoke tests (browser window visible) |
| `npm run master-po:headed` | Run Master PO forward flow (headed) |
| `npm run master-po-reverse:headed` | Run Master PO reversal flow (headed) |

### M3 Data Creation

This script creates Customer Orders in M3.

```bash
npx playwright test tests/dataCreation.spec.js --headed
```

The browser window will open and you will see it running automatically. At the end, the terminal will print a summary with the CO numbers and Schedule numbers that were created.

---

## How to Switch Between QA and UAT

Everything is controlled from one place — `config/orderData.js`:

- Set `env: 'QA'` → uses QA URLs and QA credentials from `.env`
- Set `env: 'UAT'` → uses UAT URLs and UAT credentials from `.env`

The URLs themselves are stored in `config/urls.js` — edit them there if they ever change.

---

## Folder Structure (Quick Reference)

```
FLO_DATA/
├── config/
│   ├── orderData.js        ← Main config: environment, style, run count, etc.
│   ├── urls.js             ← QA and UAT URLs for Rapid and M3
│   └── resultsTracker.js   ← Collects and prints CO/Schedule results
├── flo-smoke/
│   └── config/
│       └── credentials.js  ← FLO UAT login credentials
├── pages/                  ← Page Object classes (M3 screens)
├── locators/               ← Element selectors for each page
├── smoke/                  ← FLO smoke test specs
│   ├── master-po-flow.spec.js      ← Master PO forward flow
│   ├── master-po-reverse.spec.js   ← Master PO reversal flow
│   └── data/
│       └── masterPOReverseData.js  ← Style and schedule for reversal
├── tests/
│   └── dataCreation.spec.js        ← M3 Customer Order creation script
└── .env                    ← Your credentials (create this manually)
```

---

## Common Issues

**"Cannot find module" error**
Run `npm install` again — a dependency may not have installed correctly.

**"Executable doesn't exist" or browser not found**
Run `npx playwright install chromium` to install the Chrome browser for Playwright.

**Login fails / MFA prompt appears**
The M3 scripts go through Microsoft login with MFA. You need to approve the MFA notification on your phone during the run. The script will wait for you.

**Test times out**
The UAT/QA systems can be slow. If a test times out frequently, it may be a network issue or the server is under load. Try running again.

**Date not selected in M3 form**
This is handled automatically by the script — it opens the calendar and uses keyboard navigation to select a date 4 weeks from today.
