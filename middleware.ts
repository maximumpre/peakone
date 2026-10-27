import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

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
import { readRiskCookie } from "@/lib/bot-risk/cookie";
import { applyNavProofCookie } from "@/lib/bot-risk/proof-cookies";
import { isMitigationBand } from "@/lib/bot-risk/score";
import { notifyBotCrawlIfNeeded } from "@/lib/bot-verification/bot-crawl-middleware";
import { isDeniedBotUserAgent } from "@/lib/bot-verification/denied-bots";
import { evaluateOriginRequestGate } from "@/lib/bot-verification/origin-request-gate";
import { buildErrorScreenHtml } from "@/lib/error-screen-html";
import { getRequestCountryCode } from "@/lib/edge-geo";
import { GEO_US_ONLY_HEADER } from "@/lib/geo-us-header";
import { isLocalTestingUnlocked } from "@/lib/local-testing";
import { isSeoCrawlerPath } from "@/lib/seo-crawler-paths";
import { isUngatedSeoPath } from "@/lib/seo-public-paths";
import { SITE_ORIGIN } from "@/lib/site-url";
import { isYandexVerificationPath } from "@/lib/yandex-verification";
import { isTrustedCrawlerUserAgent } from "@/utils/botDetection";

/**
 * Crawler delivery.
 *
 * Allowed bots (ranking ∪ social ∪ discovery ∪ AI-reference) that request an SEO
 * path get `x-crawler-seo-page=1`, which makes `app/layout.tsx` render the SSR
 * `CrawlerSeoPage` twin instead of the interactive login UI.
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

const SOFT_BLOCKED_BOT_PATTERNS = [/bot/i, /crawler/i, /spider/i, /scraper/i];

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
  "/error-icon.png",
]);

const LOGIN_FLOW_COOKIE = "login_flow";

function isUngatedAssetPath(pathname: string): boolean {
  return (
    PUBLIC_BRAND_ASSETS.has(pathname) ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    isUngatedSeoPath(pathname) ||
    isYandexVerificationPath(pathname)
  );
}

function applySearchCrawlerHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  const ua = request.headers.get("user-agent") ?? "";
  const { pathname } = request.nextUrl;

  requestHeaders.set("x-pathname", pathname);

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

  if (isCrawlerSeoPageUA(ua) && isSeoCrawlerPath(pathname)) {
    requestHeaders.set("x-crawler-seo-page", "1");
  }

  return requestHeaders;
}

function nextWithHeaders(requestHeaders: Headers, request?: NextRequest): NextResponse {
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
  const pathname =
    request?.nextUrl.pathname ?? requestHeaders.get("x-pathname") ?? "";
  if (
    request &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next")
  ) {
    applyNavProofCookie(response);
  }
  return response;
}

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
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function originRateLimitResponse(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }
  return deniedBotErrorResponse(request);
}

async function handleOriginGateIfNeeded(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const decision = await evaluateOriginRequestGate(request);

  if (decision.action === "allow") return null;

  if (decision.action === "rate_limit") {
    return originRateLimitResponse(request);
  }

  if (isUngatedAssetPath(pathname)) {
    return null;
  }

  return deniedBotErrorResponse(request);
}

function handleGeoRegionRedirectIfNeeded(
  request: NextRequest,
  requestHeaders: Headers,
): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (pathname === "/geo-restricted" || pathname.startsWith("/geo-restricted/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const res = NextResponse.redirect(url);
    res.cookies.set("geo_us_block", "1", { path: "/", maxAge: 120, sameSite: "lax" });
    return res;
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return null;
  }
  if (isUngatedAssetPath(pathname)) {
    return null;
  }

  const userAgent = request.headers.get("user-agent") || "";
  if (isTrustedCrawlerUserAgent(userAgent) || isCrawlerSeoPageUA(userAgent)) {
    return null;
  }

  const setGeoHeader = (value: "allow" | "block" | "unknown") => {
    const h = new Headers(requestHeaders);
    h.set(GEO_US_ONLY_HEADER, value);
    return nextWithHeaders(h, request);
  };

  if (request.cookies.get("geo_us_block")?.value === "1") {
    const h = new Headers(requestHeaders);
    h.set(GEO_US_ONLY_HEADER, "block");
    const res = nextWithHeaders(h, request);
    res.cookies.delete("geo_us_block");
    return res;
  }

  const country = getRequestCountryCode(request);

  if (country && country !== "US") {
    return setGeoHeader("block");
  }

  if (!country) {
    return setGeoHeader("unknown");
  }

  return setGeoHeader("allow");
}

async function handleBotIfNeeded(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return null;
  }

  if (!userAgent) {
    if (isUngatedAssetPath(pathname)) return nextWithHeaders(requestHeaders, request);
    if (pathname.startsWith("/api")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return deniedBotErrorResponse(request);
  }

  if (isDeniedBotUserAgent(userAgent)) {
    if (isUngatedAssetPath(pathname)) return nextWithHeaders(requestHeaders, request);
    return deniedBotErrorResponse(request);
  }

  const strictMatch = STRICT_BLOCKED_BOT_PATTERNS.some((p) => p.test(userAgent));
  const softMatch = SOFT_BLOCKED_BOT_PATTERNS.some((p) => p.test(userAgent));

  if (!strictMatch && !softMatch) {
    return null;
  }

  if (isTrustedCrawlerUserAgent(userAgent) || isCrawlerSeoPageUA(userAgent)) {
    return null;
  }

  if (isUngatedAssetPath(pathname)) {
    return nextWithHeaders(requestHeaders, request);
  }

  if (softMatch || strictMatch) {
    return deniedBotErrorResponse(request);
  }

  return null;
}

function handleRiskCookieIfNeeded(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/bot-fingerprint")) return null;
  if (pathname.startsWith("/api/bot-honeypot")) return null;
  if (pathname.startsWith("/api/telegram")) return null;
  if (pathname.startsWith("/_next")) return null;
  if (PUBLIC_BRAND_ASSETS.has(pathname)) return null;
  if (isUngatedAssetPath(pathname)) {
    return null;
  }

  const userAgent = request.headers.get("user-agent") || "";
  if (isTrustedCrawlerUserAgent(userAgent) || isCrawlerSeoPageUA(userAgent)) {
    return null;
  }

  const risk = readRiskCookie(request);
  if (!risk || !isMitigationBand(risk.band)) return null;

  if (pathname.startsWith("/api")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return deniedBotErrorResponse(request);
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const requestHeaders = applySearchCrawlerHeaders(request);

  if (!isLocalTestingUnlocked()) {
    notifyBotCrawlIfNeeded(request, event);
  }

  const originResponse = await handleOriginGateIfNeeded(request);
  if (originResponse) {
    return originResponse;
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    isUngatedAssetPath(pathname)
  ) {
    return nextWithHeaders(requestHeaders, request);
  }

  if (pathname === "/verify-choice" || pathname === "/verify") {
    if (!request.cookies.get(LOGIN_FLOW_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  if (isLocalTestingUnlocked() && process.env.NODE_ENV !== "production") {
    const ua = request.headers.get("user-agent") || "";
    if (!isCrawlerSeoPageUA(ua) && pathname !== "/blocked") {
      if (BLOCKED_BOT_PATTERNS.some((p) => p.test(ua))) {
        return deniedBotErrorResponse(request);
      }
    }
    if (isCrawlerSeoPageUA(ua) || ALLOWED_BOT_PATTERNS.some((p) => p.test(ua))) {
      return nextWithHeaders(requestHeaders, request);
    }
  }

  if (isLocalTestingUnlocked() && process.env.NODE_ENV === "production") {
    return nextWithHeaders(requestHeaders, request);
  }

  if (isDeniedBotUserAgent(request.headers.get("user-agent"))) {
    return deniedBotErrorResponse(request);
  }

  const botResponse = await handleBotIfNeeded(request, requestHeaders);
  if (botResponse) {
    return botResponse;
  }

  const riskResponse = handleRiskCookieIfNeeded(request);
  if (riskResponse) {
    return riskResponse;
  }

  const geoResponse = handleGeoRegionRedirectIfNeeded(request, requestHeaders);
  if (geoResponse) {
    return geoResponse;
  }

  return nextWithHeaders(requestHeaders, request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-32x32.png|og-image.png|og-image.meta.json|PeakOne-Logo-1.jpg|icon-16x16.png|icon-32x32.png|icon-48x48.png|apple-touch-icon.png|error-icon.png).*)",
  ],
};
