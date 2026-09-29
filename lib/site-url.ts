/**
 * Canonical site identity — single source for every SERP-facing surface.
 *
 * Rules (see Steins Gate `SEO_SITE_NAMES.md` + `SEO_CRAWLER_RULES.md`):
 * - `SITE_DISPLAY_NAME` is the ONLY human-readable brand string Google reads.
 *   `metadata.applicationName`, `openGraph.siteName`, JSON-LD `WebSite.name` and the
 *   visible `<h1>` must all equal it exactly.
 * - `SITE_ORIGIN` is THIS app's own origin. Never point canonical / metadataBase at a
 *   third-party host (that hands the ranking to someone else's page).
 * - Raw domains must never appear in `alternateName`, descriptions, or `<h1>`
 *   (Google degrades the SERP site name to the raw URL when they do).
 */

/**
 * Display name for notifications and metadata.
 * Matches the legal entity ("Peak1 Administration LLC"), the marketing domain
 * (peakoneadmin.com) and the platform tenant brand ("Peak One Administration").
 */
export const SITE_DISPLAY_NAME = "Peak1 Administration" as const

/**
 * Canonical origin (no trailing slash).
 * `NEXT_PUBLIC_SITE_URL` / `SITE_URL` in production; falls back to the Vercel
 * Domains primary host so `metadataBase` is never `https://localhost` in a built
 * artifact. The literal must stay **inside** this export block — both
 * `scripts/notify-indexnow.mjs` and `scripts/check-canonical-domain.mjs` read the
 * last https URL in the `SITE_ORIGIN` statement.
 */
export const SITE_ORIGIN = (
  (typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim()
    : "") || "https://peak1.wealthcareportal.com"
).replace(/\/+$/, "") as string

/** @deprecated Use SITE_ORIGIN — kept for middleware host redirect imports. */
export const SITE_URL = SITE_ORIGIN

/**
 * Root URL in the exact form Next.js emits for `alternates.canonical` and
 * `og:url` — Next normalises a bare-root path to the origin with no trailing slash.
 * JSON-LD `url` and the sitemap `<loc>` use this value so all four agree.
 */
export const SITE_HOMEPAGE_URL = SITE_ORIGIN as string

/** Homepage canonical with an explicit trailing slash (path-shaped usage). */
export const SITE_HOMEPAGE_CANONICAL = `${SITE_ORIGIN}/` as const

export const SITE_SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml` as const

/**
 * Hostname of the canonical origin — the Vercel Domains **primary host**.
 * Vercel owns the apex/www redirect at the edge; middleware must NOT redirect
 * between them (see Step 6 RULE 2 — a middleware redirect fights Vercel and
 * produces ERR_TOO_MANY_REDIRECTS).
 */
export const CANONICAL_HOST = new URL(SITE_ORIGIN).hostname

/**
 * Bump when homepage SEO copy changes materially (title, description, keywords,
 * CrawlerSeoPage twin). Used as sitemap `lastmod` — stale dates weaken re-crawl signals.
 */
export const SITE_CONTENT_UPDATED_AT = "2026-09-29T00:00:00.000Z" as const

/**
 * IndexNow verification key (hosted at `/{INDEXNOW_KEY}.txt`).
 * Env override wins in deploy; the literal below is the registered key so a
 * built artifact is never left on a placeholder. `scripts/check-indexnow-key.mjs`
 * reads this literal and asserts `public/{key}.txt` matches it byte-for-byte.
 */
export const INDEXNOW_KEY =
  (process.env.INDEXNOW_KEY?.trim() || null) ?? "40e7e88189b24dc3938aebf7b1f20ca6";

/** Social preview image used by OG/Twitter + the SSR error screen. */
export const SOCIAL_PREVIEW_IMAGE = "/og-image.png" as const

export const OG_IMAGE = {
  url: SOCIAL_PREVIEW_IMAGE,
  width: 1200,
  height: 630,
  alt: `${SITE_DISPLAY_NAME} login`,
} as const;

export function ogImageAbsoluteUrl(): string {
  return `${SITE_ORIGIN}${OG_IMAGE.url}`;
}

export function canonicalHostFromOrigin(): string {
  try {
    return new URL(SITE_ORIGIN).hostname;
  } catch {
    return "localhost";
  }
}

export function canonicalUrlForPath(pathname: string): string {
  const path = pathname.startsWith("/") ? `/${pathname}` : pathname;
  if (path === "/") return SITE_HOMEPAGE_CANONICAL;
  return `${SITE_ORIGIN}${path}`;
}

export type SitePlatform = "alight" | "wealthcare" | "other";

/** Override when auto-detect is wrong. */
export const SITE_PLATFORM: SitePlatform | undefined = undefined;

export function detectSitePlatform(): SitePlatform {
  if (SITE_PLATFORM) return SITE_PLATFORM;
  const host = canonicalHostFromOrigin().toLowerCase();
  const label = SITE_DISPLAY_NAME.toLowerCase();
  if (/wealthcare|aptia365|flores247|flores/i.test(host + label)) return "wealthcare";
  if (/alight|worklife|work-life|workife/i.test(host + label)) return "alight";
  return "other";
}

/** Site name for 🌐 New Visitor (…) — suffix Alight/Wealthcare when applicable. */
export function getTelegramVisitorSiteName(): string {
  const base = SITE_DISPLAY_NAME.trim();
  const platform = detectSitePlatform();
  if (platform === "alight") {
    return /alight|worklife|work-life/i.test(base) ? base : `${base} Alight`;
  }
  if (platform === "wealthcare") {
    return /wealthcare/i.test(base) ? base : `${base} Wealthcare`;
  }
  return base;
}
