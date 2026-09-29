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

export { PAGE_H1_HEADING };

/** `<title>` — brand first, then the plan-type terms the page genuinely serves. */
export const SITE_TITLE = "Peak1 Administration Login | FSA, HSA & Benefits Portal";

/**
 * Meta description. 25–170 characters, value-proposition only, no domain.
 * Counted by `scripts/check-meta-description.mjs` at build time.
 */
export const SITE_DESCRIPTION =
  "Sign in to manage your HSA, FSA, HRA, COBRA and dependent care benefits, submit claims, and view statements.";

export const SITE_KEYWORDS: string[] = buildSiteKeywords();
