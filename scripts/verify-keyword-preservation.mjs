#!/usr/bin/env node
/**
 * Mandatory keyword-preservation check.
 *
 * Enforces the absolute rule for this project: the verbatim baseline keyword set in
 * `lib/seo-keywords.ts` (`LEGACY_SITE_KEYWORDS`) must survive verbatim — same strings,
 * same order, same casing — and must be emitted as the head of the final `SITE_KEYWORDS`
 * list. New research keywords are allowed to be appended; baseline entries may never be
 * dropped, reordered, or re-cased.
 *
 * Also guards the two content surfaces every keyword has to reach:
 *   - layout `<meta name="keywords">` (via `lib/seo-metadata.ts`) — the FULL list,
 *     raw domain tokens included (Yandex still reads meta keywords)
 *   - the visible `Related searches: …` body block on `astro-src/pages/crawler-seo.astro`
 *     — `SITE_VISIBLE_KEYWORDS`, the same list with host tokens filtered out so
 *     domains never appear in body copy (Google/Bing read those as stuffing)
 *
 * Usage: node scripts/verify-keyword-preservation.mjs
 * Exit 1 if any baseline keyword was lost.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.join(import.meta.dirname, ".."));

const read = (rel) => {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.error(`Keyword preservation check failed: missing ${rel}`);
    process.exit(1);
  }
  return fs.readFileSync(full, "utf8");
};

const failures = [];

// ── 1. Extract LEGACY_SITE_KEYWORDS (the frozen baseline) ──────────────────────
const keywordsSrc = read("lib/seo-keywords.ts");
const legacyBlock = keywordsSrc.match(
  /export const LEGACY_SITE_KEYWORDS\s*=\s*\[([\s\S]*?)\]\s*as const/,
);
if (!legacyBlock) {
  console.error(
    "Keyword preservation check failed: LEGACY_SITE_KEYWORDS not found in lib/seo-keywords.ts.",
  );
  process.exit(1);
}
const baseline = [...legacyBlock[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);

if (baseline.length === 0) {
  console.error("Keyword preservation check failed: LEGACY_SITE_KEYWORDS is empty.");
  process.exit(1);
}

// ── 2. Rebuild the final list from the cluster arrays, in merge order ──────────
// `buildSiteKeywords()` is a plain case-sensitive de-dupe over the arrays below, so
// the same result is reproduced here from the parsed source (no TS evaluation needed).
const CLUSTER_NAMES = [
  "LEGACY_SITE_KEYWORDS",
  "BRAND_KEYWORDS",
  "PLAN_LOGIN_KEYWORDS",
  "ACCOUNT_RECOVERY_KEYWORDS",
  "PARTICIPANT_TASK_KEYWORDS",
  "PLAN_MECHANICS_KEYWORDS",
  "EMPLOYER_COMMERCIAL_KEYWORDS",
  "SUPPORT_KEYWORDS",
  "INTENT_KEYWORDS",
  "RESEARCH_HARVEST_KEYWORDS",
];

const parseKeywordArray = (name) => {
  const block = keywordsSrc.match(
    new RegExp(`export const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`),
  );
  if (!block) {
    console.error(
      `Keyword preservation check failed: could not parse ${name} from lib/seo-keywords.ts`,
    );
    process.exit(1);
  }
  return [...block[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
};

const mergeBody = keywordsSrc.match(
  /function mergeKeywords\([\s\S]*?\n\}/,
);
if (!mergeBody) {
  console.error("Keyword preservation check failed: mergeKeywords() not found.");
  process.exit(1);
}
if (!/seen\.has\(keyword\)/.test(mergeBody[0]) || !/seen\.add\(keyword\)/.test(mergeBody[0])) {
  failures.push(
    "lib/seo-keywords.ts: mergeKeywords() must de-duplicate case-SENSITIVELY on the trimmed keyword",
  );
}

const finalList = [];
const seen = new Set();
for (const name of CLUSTER_NAMES) {
  for (const raw of parseKeywordArray(name)) {
    const kw = raw.trim();
    if (!kw || seen.has(kw)) continue;
    seen.add(kw);
    finalList.push(kw);
  }
}

if (!Array.isArray(finalList) || finalList.length === 0) {
  console.error("Keyword preservation check failed: buildSiteKeywords() returned nothing.");
  process.exit(1);
}

// ── 3. Every baseline keyword present, in order, at the head of the list ───────
const missing = baseline.filter((kw) => !finalList.includes(kw));
if (missing.length > 0) {
  failures.push(
    `baseline keywords dropped: ${missing.map((k) => `"${k}"`).join(", ")}`,
  );
}

const head = finalList.slice(0, baseline.length);
if (head.join("\x00") !== baseline.join("\x00")) {
  failures.push(
    "baseline keywords are not the leading entries of SITE_KEYWORDS (order or casing changed)",
  );
}

// ── 4. Catch accidental case-folding outside the baseline ─────────────────────
// The baseline legitimately ships both "Peak1" and "peak1". Only a case-insensitive
// duplicate that is NOT already in the baseline indicates a keyword was folded away.
const baselineFolded = new Set(baseline.map((kw) => kw.toLowerCase()));
const counts = new Map();
for (const kw of finalList) {
  const key = kw.toLowerCase();
  counts.set(key, (counts.get(key) ?? 0) + 1);
}
const collapsed = [...counts.entries()]
  .filter(([key, n]) => n > 1 && !baselineFolded.has(key))
  .map(([key]) => key);
if (collapsed.length > 0) {
  failures.push(
    `case-insensitive duplicate keywords detected outside the baseline: ${collapsed.join(", ")}`,
  );
}

// ── 5. The shared metadata module re-exports the same list ────────────────────
const metaSrc = read("lib/seo-metadata.ts");
if (!/SITE_KEYWORDS: string\[\]\s*=\s*buildSiteKeywords\(\)/.test(metaSrc)) {
  failures.push(
    "lib/seo-metadata.ts: SITE_KEYWORDS must be buildSiteKeywords() so layout meta and body share one list",
  );
}

// The body-safe subset must exist so host tokens can leave the body without
// leaving the preserved set.
if (!/export const SITE_VISIBLE_KEYWORDS\s*=/.test(metaSrc)) {
  failures.push(
    "lib/seo-metadata.ts: missing SITE_VISIBLE_KEYWORDS (body-safe subset — domains stay meta-only)",
  );
}

// ── 6. The Astro crawler twin renders them as visible body text ────────────────
const twinRel = "astro-src/pages/crawler-seo.astro";
const crawlerSrc = read(twinRel);
if (!/Related searches:/.test(crawlerSrc)) {
  failures.push(`${twinRel}: missing visible \`Related searches:\` body block`);
}
// Only the keyword block's own markup matters — a `0.65` disabled-button opacity
// elsewhere on the page is normal chrome, not hidden text. Anchor on the rendered
// section, not the first "Related searches" string (which lives in the header comment).
const sectionStart = crawlerSrc.indexOf('aria-label="Related searches"');
const sectionEnd = crawlerSrc.indexOf("</section>", sectionStart);
const keywordBlock =
  sectionStart === -1 ? "" : crawlerSrc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd);
if (!keywordBlock) {
  failures.push(
    `${twinRel}: could not locate the rendered \`Related searches\` section`,
  );
} else {
  if (/\bsr-only\b/.test(keywordBlock)) {
    failures.push(`${twinRel}: keyword block must not use \`sr-only\``);
  }
  if (/display:\s*none/.test(keywordBlock)) {
    failures.push(`${twinRel}: keyword block must not use \`display:none\``);
  }
  if (/opacity:\s*0\s*(;|\)|\}|\s|$)/m.test(keywordBlock)) {
    failures.push(`${twinRel}: keyword block must not use zero opacity`);
  }
  if (
    !/SITE_VISIBLE_KEYWORDS\.join\(/.test(keywordBlock) &&
    !/\{visibleKeywords\}/.test(keywordBlock)
  ) {
    failures.push(
      `${twinRel}: the rendered section must emit the SITE_VISIBLE_KEYWORDS list (full list stays in <meta keywords>)`,
    );
  }
}
const relatedIdx = crawlerSrc.indexOf("Related searches:");
const footerIdx = crawlerSrc.indexOf("<footer");
if (relatedIdx !== -1 && footerIdx !== -1 && relatedIdx > footerIdx) {
  failures.push(
    `${twinRel}: \`Related searches:\` must render BEFORE <footer>`,
  );
}
if (!/SITE_VISIBLE_KEYWORDS\.join\(/.test(crawlerSrc)) {
  failures.push(
    `${twinRel}: must render the SITE_VISIBLE_KEYWORDS list in the visible body block`,
  );
}

// ── 7. Layout wires keywords into metadata ───────────────────────────────────
const layoutSrc = read("app/layout.tsx");
if (!/keywords:\s*SITE_KEYWORDS/.test(layoutSrc)) {
  failures.push("app/layout.tsx: missing `keywords: SITE_KEYWORDS` in the metadata export");
}

if (failures.length) {
  console.error("FAIL keyword preservation");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

const added = finalList.length - baseline.length;
console.log(
  `OK keyword preservation — ${baseline.length} baseline keywords intact (verbatim, in order), ` +
    `${added} research keywords appended, ${finalList.length} total.`,
);
