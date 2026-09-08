require('dotenv').config();
const fs                 = require('fs');
const path               = require('path');
const { test }           = require('@playwright/test');
const { RapidLoginPage } = require('../../pages/m3/RapidLoginPage');
const { M3LoginPage }    = require('../../pages/m3/M3LoginPage');
const { orderData }      = require('../../config/m3/orderData');
const { URLS }           = require('../../config/m3/urls');

const AUTH_DIR       = path.resolve(__dirname, '../../playwright/.auth');
const TOKENS_FILE    = path.join(AUTH_DIR, 'm3-tokens.json');

const env       = orderData.env;
const RAPID_URL = URLS[env].RAPID;
const M3_URL    = URLS[env].M3;
const EMAIL     = env === 'QA' ? process.env.QA_EMAIL    : process.env.UAT_EMAIL;
const PASSWORD  = env === 'QA' ? process.env.QA_PASSWORD : process.env.UAT_PASSWORD;

test.describe('Session Setup', () => {

  test(`Open Iron Hide + M3 (${env}) and keep browser alive`, async ({ browser }) => {
    test.setTimeout(0); // no timeout — stays open until manually closed

    const context = await browser.newContext();

    // ── Capture bearer tokens seen on any outgoing request ──────────
    // M3's H5 client and its REST/OData backend calls carry the auth
    // token as an `Authorization: Bearer ...` header, not in a cookie
    // we can read directly — so we sniff it off the network instead.
    const capturedTokens = new Map(); // token -> { url, seenAt }
    context.on('request', (req) => {
      const auth = req.headers()['authorization'];
      if (auth && /^bearer\s/i.test(auth) && !capturedTokens.has(auth)) {
        capturedTokens.set(auth, { url: req.url(), seenAt: new Date().toISOString() });
        console.log(`🔑 Bearer token captured from: ${req.url()}`);
      }
    });

    // ── Tab 1: Iron Hide (Rapid) ───────────────────────────────────
    const rapidPage  = await context.newPage();
    const rapidLogin = new RapidLoginPage(rapidPage);

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  SESSION SETUP  [${env}]`);
    console.log(`${'═'.repeat(50)}\n`);

    await test.step('Open Iron Hide and sign in with Brandix', async () => {
      console.log(`>>> Navigating to Iron Hide (${env}): ${RAPID_URL}`);
      await rapidLogin.goto(RAPID_URL);
      await rapidLogin.clickBrandixSignIn();
    });

    await test.step('Complete Microsoft login', async () => {
      await rapidLogin.completeMicrosoftLogin(EMAIL, PASSWORD);
    });

    await test.step('Select company from dropdown', async () => {
      await rapidLogin.selectFirstCompany();
      console.log('✅ Iron Hide company selected — session established');
    });

    // ── Tab 2: M3 ──────────────────────────────────────────────────
    const m3Page  = await context.newPage();
    const m3Login = new M3LoginPage(m3Page);

    await test.step('Open M3 and log in', async () => {
      console.log(`\n>>> Navigating to M3 (${env}): ${M3_URL}`);
      await m3Login.goto(M3_URL);
      await m3Login.login(EMAIL, PASSWORD);
      console.log('✅ M3 login complete');
    });

    const EXPLORE_SECONDS = 45;
    console.log(`\n⏳ You have ${EXPLORE_SECONDS}s — switch to the M3 tab and open a program/menu`);
    console.log('   so it fires real API calls, then wait for the capture step to run.\n');
    await m3Page.waitForTimeout(EXPLORE_SECONDS * 1000);

    await test.step('Capture auth tokens', async () => {
      // M3's H5 shell is iframe-heavy and fires its backend calls lazily,
      // so give it a bit more time (+ wait for network to settle) before
      // we snapshot anything.
      await m3Page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Dump every frame's storage (unfiltered — key naming varies enough
      // between apps that a token/jwt/auth regex risks missing the real
      // one), not just the top-level document. M3's shell loads the actual
      // client inside a cross-origin iframe, whose storage the top frame
      // can't see, so we must evaluate inside each frame individually.
      const dumpFrameStorage = async (frame) => {
        try {
          return await frame.evaluate(() => {
            const grab = (store) => {
              const out = {};
              for (let i = 0; i < store.length; i++) {
                const key = store.key(i);
                out[key] = store.getItem(key);
              }
              return out;
            };
            return { localStorage: grab(window.localStorage), sessionStorage: grab(window.sessionStorage) };
          });
        } catch (err) {
          return { error: err.message }; // cross-origin frames can throw on storage access
        }
      };

      const dumpAllFrames = async (page) => {
        const result = {};
        for (const frame of page.frames()) {
          result[frame.url() || '(no url)'] = await dumpFrameStorage(frame);
        }
        return result;
      };

      const [rapidStorage, m3Storage] = await Promise.all([
        dumpAllFrames(rapidPage),
        dumpAllFrames(m3Page),
      ]);

      const m3Tokens = [...capturedTokens.entries()]
        .map(([token, meta]) => ({ token, ...meta }))
        .filter((t) => t.url.includes(new URL(M3_URL).hostname));

      fs.mkdirSync(AUTH_DIR, { recursive: true });
      fs.writeFileSync(TOKENS_FILE, JSON.stringify({
        capturedAt: new Date().toISOString(),
        allBearerTokensFromNetwork: [...capturedTokens.entries()].map(([token, meta]) => ({ token, ...meta })),
        m3BearerTokens: m3Tokens,
        rapidStorageByFrame: rapidStorage,
        m3StorageByFrame: m3Storage,
      }, null, 2));

      console.log(`💾 Saved ${capturedTokens.size} network token(s) (${m3Tokens.length} from M3 host) + per-frame storage dump to ${TOKENS_FILE}`);
      if (m3Tokens.length === 0) {
        console.log('⚠️  No bearer token seen from the M3 host yet — try navigating into a program/menu in the M3 tab, then re-check the file (the listener keeps capturing for as long as the browser stays open).');
      }
    });

    // ── Keep browser open ──────────────────────────────────────────
    console.log('\n');
    console.log('🟢 ============================================');
    console.log('🟢  Both tabs are ready:');
    console.log(`🟢    Tab 1 — Iron Hide (${env})`);
    console.log(`🟢    Tab 2 — M3 (${env})`);
    console.log('🟢');
    console.log('🟢  Browser will stay open.');
    console.log('🟢  Press Ctrl+C in this terminal to end the session.');
    console.log('🟢 ============================================');
    console.log('\n');

    // Never resolves — keeps the test (and browser) alive until you stop
    // the process manually (Ctrl+C in the terminal). Do NOT use page.pause()
    // here: resuming it finishes the test, which tears down the browser
    // fixture and closes the window right after.
    await new Promise(() => {});
  });

});
