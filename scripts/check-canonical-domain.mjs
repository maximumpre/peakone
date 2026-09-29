#!/usr/bin/env node

/**
 * Canonical domain / host-alignment audit (Step 6 SECTOR E).
 *
 * Fails the build when the site's canonical identity is internally inconsistent,
 * points at a placeholder, or would emit an origin that redirects. A mismatch
 * between `SITE_ORIGIN` and the real host turns `og:image` into a 308 redirect and
 * leaves Facebook / LinkedIn / WhatsApp with blank social-preview cards.
 *
 * Checks, from source (no network, no build required):
 *   1. SITE_ORIGIN exists, is https, and carries no trailing slash
 *   2. SITE_ORIGIN is not a placeholder (example.com / localhost / REPLACE_*)
 *   3. SITE_URL === SITE_ORIGIN
 *   4. SITE_HOMEPAGE_CANONICAL === `${SITE_ORIGIN}/`
 *   5. CANONICAL_HOST === new URL(SITE_ORIGIN).hostname
 *   6. Every canonical consumer derives from SITE_ORIGIN (no hardcoded hosts)
 *   7. Middleware performs no apex/www redirect (Vercel owns it — Step 6 RULE 2)
 */

import { readFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const SITE_URL_CANDIDATES = [
  path.join(ROOT, "lib", "site-url.ts"),
  path.join(ROOT, "src", "lib", "site-url.ts"),
];

const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "localhost",
  "your-domain.com",
  "yourdomain.com",
  "www.your-domain.com",
]);

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);
const ok = (m) => notes.push(m);

function extractStringConst(source, name) {
  // `export const NAME = "…"`  |  `export const NAME = "…" as const`
  const m = source.match(
    new RegExp(`export\\s+const\\s+${name}\\s*=\\s*(["'\`])([^"'\`]*)\\1`),
  );
  return m ? m[2] : null;
}

function extractTemplateRef(source, name) {
  // `export const NAME = \`${ORIGIN}\`/`  — record the referenced identifiers
  const m = source.match(
    new RegExp("export\\s+const\\s+" + name + "\\s*=\\s*`([^`]*)`"),
  );
  return m ? m[1] : null;
}

async function main() {
  let siteUrlFile = null;
  for (const candidate of SITE_URL_CANDIDATES) {
    try {
      await access(candidate);
      siteUrlFile = candidate;
      break;
    } catch {
      /* try next */
    }
  }
  if (!siteUrlFile) {
    fail("lib/site-url.ts not found");
    report();
    return;
  }

  const source = await readFile(siteUrlFile, "utf8");

  // ---- 1/2. SITE_ORIGIN shape ----
  // Accept a literal, or `… || "https://…"` / `… ?? "https://…"` fallback.
  const originMatch =
    source.match(/export\s+const\s+SITE_ORIGIN\s*=\s*(["'])([^"']*)\1/) ??
    source.match(
      /CONFIGURED_ORIGIN\s*=\s*[\s\S]*?(?:\?\?|\|\|)\s*(["'])(https?:\/\/[^"']*)\1/,
    ) ??
    source.match(
      /export\s+const\s+SITE_ORIGIN\s*=\s*[\s\S]*?(?:\?\?|\|\|)\s*(["'])(https?:\/\/[^"']*)\1/,
    );

  const origin = originMatch ? originMatch[2].trim() : null;
  if (!origin) {
    fail("SITE_ORIGIN could not be resolved from lib/site-url.ts");
    report();
    return;
  }
  ok(`SITE_ORIGIN = ${origin}`);

  if (!/^https:\/\//i.test(origin)) {
    fail(`SITE_ORIGIN must be https:// — got ${origin}`);
  }
  if (origin.endsWith("/")) {
    fail(`SITE_ORIGIN must have no trailing slash — got ${origin}`);
  }

  let host = null;
  try {
    host = new URL(origin).hostname;
  } catch {
    fail(`SITE_ORIGIN is not a valid URL: ${origin}`);
  }
  if (host) {
    if (PLACEHOLDER_HOSTS.has(host.toLowerCase())) {
      fail(`SITE_ORIGIN host is a placeholder: ${host}`);
    } else {
      ok(`host = ${host}`);
    }
  }

  // ---- 3. SITE_URL === SITE_ORIGIN ----
  if (!/export\s+const\s+SITE_URL\s*=\s*SITE_ORIGIN/.test(source)) {
    fail("SITE_URL must be `= SITE_ORIGIN` (an alias, not a second value)");
  } else {
    ok("SITE_URL = SITE_ORIGIN");
  }

  // ---- 4. SITE_HOMEPAGE_CANONICAL ----
  const canonical = extractTemplateRef(source, "SITE_HOMEPAGE_CANONICAL");
  if (canonical !== "${SITE_ORIGIN}/") {
    fail(
      `SITE_HOMEPAGE_CANONICAL must be \`\${SITE_ORIGIN}/\` — got \`${canonical}\``,
    );
  } else {
    ok("SITE_HOMEPAGE_CANONICAL = ${SITE_ORIGIN}/");
  }

  // ---- 5. CANONICAL_HOST ----
  if (!/export\s+const\s+CANONICAL_HOST/.test(source)) {
    fail("CANONICAL_HOST is not exported from lib/site-url.ts");
  } else if (!/CANONICAL_HOST\s*=\s*new URL\(\s*SITE_ORIGIN\s*\)\.hostname/.test(source)) {
    fail("CANONICAL_HOST must derive from `new URL(SITE_ORIGIN).hostname`");
  } else {
    ok("CANONICAL_HOST = new URL(SITE_ORIGIN).hostname");
  }

  // ---- 6. consumers derive from SITE_ORIGIN ----
  // URL-emitting consumers must derive from the canonical origin. Each entry
  // lists identifiers that count as "derived" — SITE_HOMEPAGE_URL and
  // SITE_HOMEPAGE_CANONICAL are aliases of SITE_ORIGIN in lib/site-url.ts.
  const consumerFiles = [
    ["app/robots.txt/route.ts", ["SITE_ORIGIN", "SITE_SITEMAP_URL"]],
    ["app/sitemap.ts", ["SITE_ORIGIN", "SITE_HOMEPAGE_URL", "SITE_SITEMAP_URL"]],
    ["app/layout.tsx", ["SITE_HOMEPAGE_CANONICAL", "SITE_ORIGIN"]],
    ["lib/error-screen-html.ts", ["SITE_ORIGIN"]],
    ["components/structured-data.tsx", ["SITE_ORIGIN"]],
  ];
  // Copy-only modules hold no URLs by design — they are scanned for stale hosts
  // below, but are not required to reference SITE_ORIGIN.
  const copyOnlyFiles = ["lib/seo-metadata.ts", "lib/seo-keywords.ts"];

  for (const [rel, wanted] of consumerFiles) {
    const abs = path.join(ROOT, rel);
    try {
      await access(abs);
    } catch {
      notes.push(`(absent, skipped) ${rel}`);
      continue;
    }
    const txt = await readFile(abs, "utf8");
    // OR semantics: the file must derive from the origin through ANY of the
    // listed aliases (SITE_HOMEPAGE_URL / SITE_HOMEPAGE_CANONICAL are aliases of
    // SITE_ORIGIN in lib/site-url.ts), not all of them.
    const found = wanted.some((n) => new RegExp(`\\b${n}\\b`).test(txt));
    if (!found) {
      fail(`${rel} does not reference any of ${wanted.join(", ")}`);
    } else {
      ok(`${rel} derives from SITE_ORIGIN`);
    }
    // stale hardcoded origins
    const stale = txt.match(/https?:\/\/[a-z0-9.-]+\.(com|net|org|io)\b/gi) ?? [];
    const bad = stale.filter((u) => {
      try {
        return new URL(u).hostname.toLowerCase() !== (host ?? "").toLowerCase();
      } catch {
        return true;
      }
    });
    // ignore schema.org / w3.org / sitemaps.org vocabulary URLs
    const realBad = bad.filter(
      (u) =>
        !/schema\.org|w3\.org|sitemaps\.org|google\.com|googleapis\.com|gstatic\.com|bing\.com/i.test(u),
    );
    if (realBad.length) {
      fail(`${rel} hardcodes non-canonical host(s): ${[...new Set(realBad)].join(", ")}`);
    }
  }

  // Copy-only modules must never hardcode a host either (descriptions and H1s
  // carrying a raw domain degrade the SERP site name to the bare URL).
  for (const rel of copyOnlyFiles) {
    const abs = path.join(ROOT, rel);
    try {
      await access(abs);
    } catch {
      continue;
    }
    const txt = await readFile(abs, "utf8");
    const stale = txt.match(/https?:\/\/[a-z0-9.-]+\.(com|net|org|io)\b/gi) ?? [];
    const bad = stale.filter(
      (u) =>
        !/schema\.org|w3\.org|sitemaps\.org|google\.com|googleapis\.com|gstatic\.com|bing\.com/i.test(u),
    );
    if (bad.length) {
      notes.push(
        `NOTE ${rel} contains bare URLs: ${[...new Set(bad)].join(", ")} (allowed as navigational keywords; forbidden in descriptions/H1)`,
      );
    }
  }

  // ---- 6b. never claim the hand-off host as our own origin ------------------
  // This is the failure mode that has bitten this project twice: pointing the
  // canonical at `app/api/login-out/route.ts`'s redirect target, which is the
  // member platform — a different site. Step 5 removed it once; it was
  // reintroduced in the Step 6 pass. Catch it at build time from now on.
  {
    const loginOut = path.join(ROOT, "app", "api", "login-out", "route.ts");
    try {
      await access(loginOut);
      const txt = await readFile(loginOut, "utf8");
      const handoffs = [
        ...txt.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi),
      ]
        .map((m) => {
          try {
            return new URL(m[0]).hostname.toLowerCase();
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      const own = (host ?? "").toLowerCase();
      const clash = handoffs.filter((h) => h === own);
      if (clash.length) {
        fail(
          `SITE_ORIGIN host (${own}) equals the login-out hand-off host in ` +
            `app/api/login-out/route.ts — the canonical must be THIS app's origin, ` +
            `not the member platform it hands off to (that is a separate site and a ` +
            `research target, not our canonical)`,
        );
      } else {
        ok(
          `SITE_ORIGIN (${own}) is distinct from the login-out hand-off host ` +
            `[${[...new Set(handoffs)].join(", ") || "none"}]`,
        );
      }
    } catch {
      notes.push("(absent, skipped) app/api/login-out/route.ts");
    }
  }

  // ---- 7. no apex/www redirect in middleware ----
  const mw = path.join(ROOT, "middleware.ts");
  try {
    await access(mw);
    const txt = await readFile(mw, "utf8");
    if (/handlePreferredHostRedirect/.test(txt)) {
      fail(
        "middleware.ts contains handlePreferredHostRedirect — Vercel Domains owns the apex/www redirect (Step 6 RULE 2)",
      );
    }
    const redirectsWww = /NextResponse\.redirect\([^)]*(?:www\.|startsWith\(["']www)/.test(txt);
    if (redirectsWww) {
      fail("middleware.ts redirects between www and apex — remove it (Step 6 RULE 2)");
    }
    ok("middleware.ts performs no apex/www redirect");
  } catch {
    notes.push("(absent, skipped) middleware.ts");
  }

  report();
}

function report() {
  for (const n of notes) console.log(`  ${n}`);
  if (failures.length) {
    console.error(`\ncanonical-domain check FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("canonical-domain check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
