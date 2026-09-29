#!/usr/bin/env node
/**
 * Audit crawler SEO header integrity (GSC human-UI regression).
 * See SEO_CRAWLER_RULES.md — HARD RULES: crawler header integrity.
 *
 * Usage: node scripts/audit-crawler-seo.mjs [project-root]
 * Exit 1 if any check fails.
 */

import fs from "node:fs"
import path from "node:path"

const root = path.resolve(process.argv[2] ?? process.cwd())

function readIfExists(relPaths) {
  for (const rel of relPaths) {
    const full = path.join(root, rel)
    if (fs.existsSync(full)) return { rel, text: fs.readFileSync(full, "utf8") }
  }
  return null
}

const failures = []

const mw = readIfExists([
  "middleware.ts",
  "src/middleware.ts",
  "proxy.ts",
  "src/proxy.ts",
])

if (!mw) {
  failures.push("missing middleware.ts / proxy.ts")
} else {
  const text = mw.text

  if (!/applySearchCrawlerHeaders|x-crawler-seo-page/.test(text)) {
    failures.push(`${mw.rel}: missing applySearchCrawlerHeaders / x-crawler-seo-page`)
  }

  if (!/x-pathname/.test(text)) {
    failures.push(`${mw.rel}: missing x-pathname stamp (layout UA fallback needs it)`)
  }

  if (!/cookies\.set\(\s*["']x-crawler-seo-page["']/.test(text)) {
    failures.push(`${mw.rel}: missing response cookie x-crawler-seo-page (RSC bridge)`)
  }

  if (!/nextWithHeaders|createNextResponse|attachCrawlerSeoCookie/.test(text)) {
    failures.push(
      `${mw.rel}: missing nextWithHeaders / createNextResponse / attachCrawlerSeoCookie single-exit helper`,
    )
  }

  // After crawler stamps, geo/next must not rebuild from bare request.headers.
  // Allow the initial clone inside applySearchCrawlerHeaders only.
  const withoutApply = text.replace(
    /function applySearchCrawlerHeaders[\s\S]*?\n\}/,
    "/* applySearchCrawlerHeaders omitted */",
  )
  if (/new Headers\(\s*request\.headers\s*\)/.test(withoutApply)) {
    failures.push(
      `${mw.rel}: new Headers(request.headers) outside applySearchCrawlerHeaders — drops crawler stamps (use requestHeaders)`,
    )
  }
}

const layout = readIfExists([
  "app/layout.tsx",
  "src/app/layout.tsx",
  "app/layout.jsx",
  "src/app/layout.jsx",
])

if (!layout) {
  failures.push("missing app/layout.tsx")
} else {
  const text = layout.text

  if (!/CrawlerSeoPage/.test(text)) {
    failures.push(`${layout.rel}: missing CrawlerSeoPage import/render`)
  }

  if (!/x-crawler-seo-page/.test(text)) {
    failures.push(`${layout.rel}: missing x-crawler-seo-page header/cookie check`)
  }

  const hasUaFallback =
    /isCrawlerSeoPageUA/.test(text) ||
    /isSearchCrawlerUA/.test(text) ||
    /x-is-search-crawler/.test(text) ||
    (/SEARCH_CRAWLER_UA|CRAWLER_SEO_PAGE_UA/.test(text) &&
      /isSeoCrawlerPath|SEO_CRAWLER_PATHS/.test(text))

  if (!hasUaFallback) {
    failures.push(
      `${layout.rel}: missing UA/path fallback (isCrawlerSeoPageUA / isSearchCrawlerUA + isSeoCrawlerPath) — header-only check regresses to human UI in GSC`,
    )
  }

  if (!/force-dynamic/.test(text)) {
    failures.push(`${layout.rel}: missing export const dynamic = "force-dynamic"`)
  }
}

const botDetection = readIfExists([
  "utils/botDetection.ts",
  "src/utils/botDetection.ts",
  "lib/botDetection.ts",
  "src/lib/botDetection.ts",
])

if (botDetection) {
  if (!/Google-InspectionTool|google-inspectiontool/i.test(botDetection.text)) {
    failures.push(`${botDetection.rel}: missing Google-InspectionTool in BOT_PATTERNS`)
  }
  if (!/MicrosoftPreview/i.test(botDetection.text)) {
    failures.push(`${botDetection.rel}: missing MicrosoftPreview in bing patterns`)
  }
}

const libBot = readIfExists(["lib/bot-detection.ts", "src/lib/bot-detection.ts"])
if (libBot && !/google-inspectiontool/i.test(libBot.text)) {
  failures.push(`${libBot.rel}: SEARCH_CRAWLER_UA missing google-inspectiontool`)
}
if (libBot && !/isCrawlerSeoPageUA/.test(libBot.text)) {
  failures.push(`${libBot.rel}: missing isCrawlerSeoPageUA (ranking ∪ social ∪ discovery)`)
}
if (libBot && !/SOCIAL_PREVIEW_UA|DISCOVERY_CRAWLER_UA/.test(libBot.text)) {
  failures.push(`${libBot.rel}: missing SOCIAL_PREVIEW_UA / DISCOVERY_CRAWLER_UA`)
}

const deniedBots = readIfExists([
  "lib/bot-verification/denied-bots.ts",
  "src/lib/bot-verification/denied-bots.ts",
])
if (!deniedBots) {
  failures.push("missing lib/bot-verification/denied-bots.ts")
} else {
  if (!/ahrefsbot/i.test(deniedBots.text) || !/semrush/i.test(deniedBots.text)) {
    failures.push(`${deniedBots.rel}: must deny Ahrefs + Semrush`)
  }
  if (!/nuclei/i.test(deniedBots.text)) {
    failures.push(`${deniedBots.rel}: missing security scanner tokens (e.g. nuclei)`)
  }
}

if (mw) {
  if (!/isDeniedBotUserAgent/.test(mw.text)) {
    failures.push(`${mw.rel}: missing isDeniedBotUserAgent check`)
  }
  if (!/buildErrorScreenHtml|deniedBotErrorResponse/.test(mw.text)) {
    failures.push(`${mw.rel}: missing SSR ErrorScreen for denied bots`)
  }
  // Soft + strict unknown bots on HTML → ErrorScreen (never plain Forbidden on documents)
  if (
    /if\s*\(\s*strictMatch\s*\)\s*\{[\s\S]{0,120}new\s+NextResponse\(\s*["']Forbidden["']/.test(
      mw.text,
    ) &&
    !/softMatch\s*\|\|\s*strictMatch/.test(mw.text)
  ) {
    failures.push(
      `${mw.rel}: strict automation bots must get deniedBotErrorResponse, not plain Forbidden 403`,
    )
  }
  if (
    /return\s+new\s+NextResponse\(\s*["']Forbidden["']/.test(mw.text) &&
    /softMatch\s*&&\s*!strictMatch/.test(mw.text) &&
    !/softMatch\s*\|\|\s*strictMatch/.test(mw.text)
  ) {
    failures.push(
      `${mw.rel}: use softMatch || strictMatch → deniedBotErrorResponse (no document Forbidden)`,
    )
  }
  // Denied UAs must not stamp x-crawler-seo-page
  if (
    /isDeniedBotUserAgent/.test(mw.text) &&
    /function applySearchCrawlerHeaders[\s\S]*?isDeniedBotUserAgent[\s\S]*?x-crawler-seo-page[\s\S]*?\n\}/.test(
      mw.text,
    ) === false &&
    !/if \(isDeniedBotUserAgent\(ua\)\) \{\s*return requestHeaders\s*\}/.test(mw.text)
  ) {
    // Soft check: early return for denied inside applySearchCrawlerHeaders
    if (!/isDeniedBotUserAgent\(ua\)[\s\S]{0,80}return requestHeaders/.test(mw.text)) {
      failures.push(
        `${mw.rel}: denied bots must early-return in applySearchCrawlerHeaders (never stamp x-crawler-seo-page)`,
      )
    }
  }
}

const crawlerPage = readIfExists([
  "components/CrawlerSeoPage.tsx",
  "src/components/CrawlerSeoPage.tsx",
])

if (crawlerPage) {
  const text = crawlerPage.text

  if (!/Related searches:/.test(text)) {
    failures.push(`${crawlerPage.rel}: missing visible Related searches body block`)
  }

  const relatedIdx = text.indexOf("Related searches:")
  if (relatedIdx !== -1) {
    const belowFoldMarkers = [
      "<footer",
      "<Footer",
      "teaser-grid",
      "feature-grid",
      "nb-feature",
      "nbs-teaser",
    ]
    for (const marker of belowFoldMarkers) {
      const idx = text.indexOf(marker)
      if (idx !== -1 && relatedIdx > idx) {
        failures.push(
          `${crawlerPage.rel}: Related searches must appear before "${marker}" (after login, before footer/marketing)`,
        )
      }
    }
  }

  // Anti-degradation: <h1> must NOT contain raw domain URLs
  const crawlerCode = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "")
  const h1Matches = crawlerCode.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) ?? []
  for (const h1 of h1Matches) {
    if (/(?:https?:\/\/|[a-z0-9-]+\.(?:com|net|org|io|gov|edu|co))\b/i.test(h1)) {
      failures.push(
        `${crawlerPage.rel}: <h1> must NOT contain raw domain URL — causes Google site name degradation to domain`,
      )
    }
  }
}

// Anti-degradation: WebSite JSON-LD alternateName must not include domain
const structuredData = readIfExists([
  "components/structured-data.tsx",
  "src/components/structured-data.tsx",
])

if (structuredData) {
  const dataCode = structuredData.text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "")
  if (
    /SCHEMA_ALTERNATE_NAMES[\s\S]*?CANONICAL_HOST/i.test(dataCode) ||
    /alternateName[\s\S]*?CANONICAL_HOST/i.test(dataCode) ||
    /SCHEMA_ALTERNATE_NAMES[\s\S]*?["'][a-z0-9-]+\.(?:com|net|org|io|gov|edu|co)["']/i.test(dataCode)
  ) {
    failures.push(
      `${structuredData.rel}: alternateName must NOT contain CANONICAL_HOST or domain name — causes Google SERP site-name degradation to URL`,
    )
  }
}

// Anti-degradation: descriptions must not contain raw URLs or "sign in at <domain>"
const seoMeta = readIfExists([
  "lib/seo-metadata.ts",
  "src/lib/seo-metadata.ts",
  "lib/meta-description.ts",
  "src/lib/meta-description.ts",
])

if (seoMeta) {
  const metaCode = seoMeta.text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "")
  if (
    /(?:sign\s+in\s+at|access\s+at)\s+[a-z0-9-]+\.[a-z]{2,}/i.test(metaCode) ||
    /https?:\/\//i.test(metaCode)
  ) {
    failures.push(
      `${seoMeta.rel}: description must NOT contain raw domain URLs or "sign in at <domain>" — triggers Google site name degradation`,
    )
  }
}

if (failures.length) {
  console.error(`FAIL ${path.basename(root)} (crawler SEO)`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}

console.log(`OK ${path.basename(root)} (crawler SEO — header integrity)`)
