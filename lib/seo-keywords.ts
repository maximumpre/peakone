/**
 * Peak1 Administration — SEO keyword system.
 *
 * Single source of truth for BOTH:
 *   - layout `<meta name="keywords">` (via `lib/seo-metadata.ts`)
 *   - the visible `Related searches: …` body block on `components/CrawlerSeoPage.tsx`
 *
 * Keywords must never be meta-only — crawlers only see them if they are in the body.
 *
 * ⚠️ ABSOLUTE PRESERVATION RULE
 * `LEGACY_SITE_KEYWORDS` is the verbatim keyword set this project shipped with.
 * It is emitted first and unchanged, and merging is additive only — de-duplication
 * is case-SENSITIVE on purpose so no baseline entry can ever be folded away.
 * Never delete or reorder entries in that list.
 *
 * Google ignores meta keywords; Bing and several AI retrieval pipelines still
 * read them. Keep the terms natural — this is a benefits portal, not a keyword list.
 */

import { SITE_DISPLAY_NAME } from "@/lib/site-url";

/**
 * Verbatim baseline. Order and casing are preserved exactly as originally shipped —
 * every other cluster is merged after this and can only append.
 *
 * ── Written removal reason (Absolute Keyword Preservation Rule) ──────────────
 * `"peak1.wealthcareportal.com"` was removed from this baseline on 2026-09-29.
 *
 * Extraordinary technical reason: that host is **not this project's domain**. This
 * app is served on `peak1-wealthcareportal.com`; `peak1.wealthcareportal.com` is
 * the member-platform hand-off target in `app/api/login-out/route.ts` — a separate
 * site. Carrying a third-party host in our own meta keywords is the domain-leakage
 * anti-pattern the kit's `SEO_SITE_NAMES.md` forbids, and `check-canonical-domain.mjs`
 * now fails the build on it. The term cannot be "upgraded" or retained as a
 * navigational keyword because it navigates users to a different product.
 *
 * This is the only baseline entry ever removed. All 15 remaining baseline keywords
 * are unchanged, in order, with original casing.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const LEGACY_SITE_KEYWORDS = [
  "Peak1",
  "peak1",
  "benefits login",
  "employee benefits portal",
  "FSA login",
  "HSA login",
  "COBRA login",
  "account access",
  "health benefits",
  "dependent care",
  "reimbursement account",
  "secure login",
  "participant portal",
  "employer portal",
  "handshake authentication",
] as const;

/** `<h1>` on `/` and on the crawler twin. Must lead with the brand, never a domain. */
export const PAGE_H1_HEADING = `${SITE_DISPLAY_NAME} Login`;

/** Brand + navigational cluster — Peak1 owns this SERP outright; it is nearly empty today. */
export const BRAND_KEYWORDS = [
  "Peak One Administration",
  "Peak1 Administration login",
  "peak one benefits login",
  "peakoneadmin",
  "Peak One Administration login",
  "peak1 participant portal",
  "member login",
  "account sign in",
] as const;

/** Plan-type account access — the literal "{plan} login" family nobody in benefits ranks for. */
export const PLAN_LOGIN_KEYWORDS = [
  "HRA login",
  "VEBA login",
  "Section 125 login",
  "dependent care FSA login",
  "limited purpose FSA login",
  "transit FSA login",
  "commuter benefits login",
  "benefits portal login",
  "employee benefits login",
  "benefits account login",
  "health savings account login",
  "flexible spending account login",
] as const;

/** Account access + recovery — the least-served cluster in the category. */
export const ACCOUNT_RECOVERY_KEYWORDS = [
  "forgot username",
  "forgot password",
  "reset password",
  "benefits account locked",
  "unlock account",
  "benefits portal not working",
  "cannot login to benefits account",
  "account registration",
  "register for benefits",
  "recover account access",
] as const;

/** Participant tasks — currently delivered as unindexed PDFs by competitors. */
export const PARTICIPANT_TASK_KEYWORDS = [
  "submit an FSA claim",
  "how to submit an FSA claim",
  "file an FSA claim",
  "FSA reimbursement",
  "submit claim without receipt",
  "check FSA balance",
  "view account balance",
  "benefit account statements",
  "1099-SA form",
  "5498-SA form",
  "dependent care reimbursement",
  "submit a medical expense",
  "download account documents",
] as const;

/** Plan mechanics + regulation — recurring, year-anchored, and currently stale everywhere. */
export const PLAN_MECHANICS_KEYWORDS = [
  "HSA contribution limit",
  "FSA contribution limit",
  "HSA eligible expenses",
  "FSA eligible expenses",
  "FSA grace period vs carryover",
  "FSA run out period",
  "FSA carryover amount",
  "use it or lose it rule",
  "COBRA election deadline",
  "COBRA continuation coverage",
  "Section 125 cafeteria plan",
  "Section 132 commuter benefit",
  "flexible spending account",
  "health savings account",
  "health reimbursement account",
  "commuter benefits account",
  "can you have both HSA and FSA",
  "what happens to my FSA when I leave my job",
  "HSA rollover",
  "dependent care FSA limit",
] as const;

/** Employer / buyer side — commercial intent, currently unserved by this property. */
export const EMPLOYER_COMMERCIAL_KEYWORDS = [
  "benefits administration",
  "benefits administrator",
  "third party administrator",
  "TPA for FSA",
  "FSA administrator",
  "HSA administrator",
  "COBRA administrator",
  "employer benefits administration",
  "small business benefits administration",
  "open enrollment FSA",
  "benefits administration platform",
  "employee benefits administration services",
] as const;

/** Support + trust — the "I need a human" intent that drives the phone queue. */
export const SUPPORT_KEYWORDS = [
  "member care",
  "member support",
  "benefit account support",
  "benefits administrator contact",
  "participant support line",
] as const;

/** Intent / security terms carried over from the original landing metadata. */
export const INTENT_KEYWORDS = [
  "two step verification",
  "security question verification",
  "password requirements",
  "employee ID login",
  "web portal login",
] as const;

/**
 * Additive merge. De-duplication is case-sensitive on purpose: the baseline contains
 * both "Peak1" and "peak1" and neither may be folded away.
 */
function mergeKeywords(
  ...lists: readonly (readonly string[])[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const raw of list) {
      const keyword = raw.trim();
      if (!keyword || seen.has(keyword)) continue;
      seen.add(keyword);
      result.push(keyword);
    }
  }
  return result;
}

export function buildSiteKeywords(): string[] {
  return mergeKeywords(
    LEGACY_SITE_KEYWORDS,
    BRAND_KEYWORDS,
    PLAN_LOGIN_KEYWORDS,
    ACCOUNT_RECOVERY_KEYWORDS,
    PARTICIPANT_TASK_KEYWORDS,
    PLAN_MECHANICS_KEYWORDS,
    EMPLOYER_COMMERCIAL_KEYWORDS,
    SUPPORT_KEYWORDS,
    INTENT_KEYWORDS,
  );
}

export const SITE_KEYWORDS = buildSiteKeywords();
