import {
  AI_REFERENCE_CRAWLER_AGENTS,
  AI_TRAINING_CRAWLER_AGENTS,
  CONTENT_SIGNAL,
} from "@/lib/ai-referral";
import { SITE_ORIGIN, SITE_SITEMAP_URL } from "@/lib/site-url";

/**
 * Landing-only crawl policy: search + AI-reference agents may crawl `/`, while AI
 * *training* agents are disallowed site-wide. `Content-Signal` declares the
 * `ai-train=no` preference.
 *
 * `/` itself is explicitly allowed — the homepage is the only page intended for
 * indexing (see `SEO_SITE_NAMES.md`). Everything below is either an API, a gated
 * verification step, or a terminal screen.
 */
const CRAWL_DISALLOW = [
  "/api/",
  "/verify",
  "/verify-choice",
  "/blocked",
  "/login-out",
] as const;

const SEARCH_AGENTS = [
  "*",
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "Applebot",
  "Baiduspider",
  "PetalBot",
  "MJ12bot",
  // Discovery / archive crawlers. Listed explicitly rather than left to the `*`
  // wildcard so the policy is auditable: these receive CrawlerSeoPage on `/`
  // (see `lib/bot-detection.ts` DISCOVERY_CRAWLER_UA). Common Crawl in particular
  // is the upstream feed for most LLM corpora, so the choice to allow it is a
  // deliberate one, recorded here.
  "YandexBot",
  "MojeekBot",
  "CCBot",
  "search.marginalia.nu",
  "ia_archiver",
] as const;

function allowGroup(userAgent: string): string {
  return [
    `User-agent: ${userAgent}`,
    "Allow: /",
    ...CRAWL_DISALLOW.map((path) => `Disallow: ${path}`),
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "",
  ].join("\n");
}

function blockGroup(userAgent: string): string {
  return [
    `User-agent: ${userAgent}`,
    "Disallow: /",
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "",
  ].join("\n");
}

/**
 * Raw text route — Next's `MetadataRoute.Robots` cannot emit the `Content-Signal`
 * header directive, so robots.txt is served from here instead of `app/robots.ts`.
 */
export function GET(): Response {
  const body = [
    "# Peak1 Administration robots — search + AI reference allow; AI training blocked",
    `# Content-Signal: ${CONTENT_SIGNAL}`,
    "",
    ...SEARCH_AGENTS.map((ua) => allowGroup(ua)),
    ...AI_REFERENCE_CRAWLER_AGENTS.map((ua) => allowGroup(ua)),
    ...AI_TRAINING_CRAWLER_AGENTS.map((ua) => blockGroup(ua)),
    `Sitemap: ${SITE_SITEMAP_URL}`,
    `Host: ${SITE_ORIGIN}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
