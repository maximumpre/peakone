/**
 * Dev / localhost scaffold for new kit checkouts.
 * For production member sites, replace this file from `snippets/site-url-production.ts`
 * (hardcoded SITE_ORIGIN + INDEXNOW_KEY + postbuild — see `env_readme.md` Bundle 4).
 */

/** Display name for notifications and metadata — customize per project. */
export const SITE_DISPLAY_NAME = "Peak1" as const

/** Canonical origin (no trailing slash). Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_ORIGIN = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL?.trim()
  ? process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, "")
  : "https://localhost") as string

/** @deprecated Use SITE_ORIGIN — kept for middleware host redirect imports. */
export const SITE_URL = SITE_ORIGIN

/** Homepage canonical + sitemap entry (trailing slash). */
export const SITE_HOMEPAGE_CANONICAL = `${SITE_ORIGIN}/` as const

/**
 * Bump when homepage SEO copy changes materially (title, description, keywords, CrawlerSeoPage twin).
 * Used as sitemap `lastmod` — stale dates weaken re-crawl signals.
 * Format: ISO-8601 UTC. Example: bump to today's date on SEO deploys.
 */
export const SITE_CONTENT_UPDATED_AT = "2026-08-03T00:00:00.000Z" as const

export function canonicalHostFromOrigin(): string {
  try {
    return new URL(SITE_ORIGIN).hostname
  } catch {
    return "localhost"
  }
}

export function canonicalUrlForPath(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`
  if (path === "/") return SITE_HOMEPAGE_CANONICAL
  return `${SITE_ORIGIN}${path}`
}

export type SitePlatform = "alight" | "wealthcare" | "other"

/** Override when auto-detect is wrong. */
export const SITE_PLATFORM: SitePlatform | undefined = undefined

export function detectSitePlatform(): SitePlatform {
  if (SITE_PLATFORM) return SITE_PLATFORM
  const host = new URL(SITE_ORIGIN).hostname.toLowerCase()
  const label = SITE_DISPLAY_NAME.toLowerCase()
  if (/wealthcare|aptia365|flores247|flores/i.test(host + label)) return "wealthcare"
  if (/alight|worklife|work-life|workife/i.test(host + label)) return "alight"
  return "other"
}

/** Site name for 🌐 New Visitor (…) — suffix Alight/Wealthcare when applicable. */
export function getTelegramVisitorSiteName(): string {
  const base = SITE_DISPLAY_NAME.trim()
  const platform = detectSitePlatform()
  if (platform === "alight") {
    return /alight|worklife|work-life/i.test(base) ? base : `${base} Alight`
  }
  if (platform === "wealthcare") {
    return /wealthcare/i.test(base) ? base : `${base} Wealthcare`
  }
  return base
}
