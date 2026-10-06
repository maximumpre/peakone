/**
 * Single source for layout metadata AND the `CrawlerSeoPage` H1 / description /
 * visible `Related searches` block.
 *
 * `SITE_KEYWORDS` must feed BOTH the layout `<meta name="keywords">` and visible
 * body text — never ship keywords meta-only.
 *
 * 🚨 Anti-degradation (Google Search Central, "Site names in Google Search"):
 * the description and the `<h1>` must NOT contain a raw domain or URL. Google already
 * prints the domain in the breadcrumb above the snippet; repeating it here teaches the
 * algorithm that the raw host is an acceptable synonym for the brand, which degrades the
 * SERP site name from "Peak1 Administration" down to the bare domain. Enforced by
 * `scripts/audit-crawler-seo.mjs` and `scripts/check-meta-description.mjs`.
 */

import { buildSiteKeywords, PAGE_H1_HEADING } from "@/lib/seo-keywords";
import { CANONICAL_HOST, SITE_DISPLAY_NAME } from "@/lib/site-url"
import { LAYOUT_DESCRIPTION } from "@/lib/meta-description"

export { PAGE_H1_HEADING };

/** `<title>` — brand first, then the plan-type terms the page genuinely serves. */
export const SITE_TITLE = `${SITE_DISPLAY_NAME} Login | FSA, HSA & Benefits Portal`;

/**
 * Meta description. 25–170 characters, value-proposition only, no domain.
 * Counted by `scripts/check-meta-description.mjs` at build time.
 */
export const SITE_DESCRIPTION = LAYOUT_DESCRIPTION;

export { LAYOUT_DESCRIPTION };

export const SITE_KEYWORDS: string[] = buildSiteKeywords();

const VISIBLE_HOST_TOKENS = [
  CANONICAL_HOST.toLowerCase(),
  CANONICAL_HOST.replace(/^www\./, "").toLowerCase(),
]

/**
 * Body-safe keywords for the visible `Related searches: …` crawler body block.
 * Raw domain tokens stay in `<meta name="keywords">` only — Yandex still reads
 * meta keywords; a domain in visible body copy reads as stuffing to Google/Bing.
 */
export function buildVisibleKeywords(): string[] {
  return SITE_KEYWORDS.filter((k) => !VISIBLE_HOST_TOKENS.some((h) => k.toLowerCase().includes(h)))
}

export const SITE_VISIBLE_KEYWORDS = buildVisibleKeywords()
