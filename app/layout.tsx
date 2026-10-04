import type React from "react";
import type { Metadata, Viewport } from "next";
import { headers, cookies } from "next/headers";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import CrawlerSeoPage from "@/components/CrawlerSeoPage";
import { StructuredData } from "@/components/structured-data";
import { CrawlerSeoHead } from "@/components/CrawlerSeoHead";
import { isCrawlerSeoPageUA } from "@/lib/bot-detection";
import { isCrawlerSeoPreviewUnlocked } from "@/lib/crawler-seo-preview";
import { isSeoCrawlerPath } from "@/lib/seo-crawler-paths";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TITLE } from "@/lib/seo-metadata";
import { INDEXABLE_PAGE_ROBOTS } from "@/lib/seo-robots-metadata";
import {
  OG_IMAGE,
  SITE_DISPLAY_NAME,
  SITE_HOMEPAGE_CANONICAL,
  ogImageAbsoluteUrl,
} from "@/lib/site-url";

const geist = Geist({ subsets: ["latin"] });

const OG_IMAGE_URL = ogImageAbsoluteUrl();

/**
 * Every SERP-facing surface below is driven from `SITE_DISPLAY_NAME` /
 * `SITE_TITLE` / `SITE_DESCRIPTION` so `applicationName`, `openGraph.siteName`,
 * the JSON-LD `WebSite.name` and the visible `<h1>` can never drift apart.
 *
 * No raw domain or URL appears in the title, description or `<h1>`.
 * `alternateName` lists brand phrases first and the bare host last (Google's
 * documented fallback when it cannot map the brand).
 *
 * `INDEXABLE_PAGE_ROBOTS` is `index, follow` + Googlebot preview hints only.
 * It deliberately carries no `noarchive` / `nosnippet` / `nocache`: Bing Webmaster
 * Tools flags those as "restrictive robots directives" even on an indexable page.
 * AI-training opt-out lives in `app/robots.txt/route.ts` instead.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_HOMEPAGE_CANONICAL),
  title: {
    default: SITE_TITLE,
    template: "%s | Peak1 Administration",
  },
  ...(SITE_KEYWORDS.length > 0 ? { keywords: SITE_KEYWORDS } : {}),
  description: SITE_DESCRIPTION,
  applicationName: SITE_DISPLAY_NAME,
  authors: [{ name: SITE_DISPLAY_NAME }],
  creator: SITE_DISPLAY_NAME,
  publisher: SITE_DISPLAY_NAME,
  category: "Business",
  referrer: "origin-when-cross-origin",
  robots: INDEXABLE_PAGE_ROBOTS,
  alternates: {
    canonical: SITE_HOMEPAGE_CANONICAL,
    languages: { "en-US": SITE_HOMEPAGE_CANONICAL },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_HOMEPAGE_CANONICAL,
    siteName: SITE_DISPLAY_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE_URL,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_URL],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "geo.region": "US",
    // Bing requires an explicit tile image for the favicon SERP surface.
    "msapplication-TileImage": "/icon-48x48.png",
  },
};

/**
 * Viewport + theme color live in their own export (Next 14+ requirement).
 * `maximumScale: 5` rather than `user-scalable=no` — disabling zoom is a WCAG
 * failure and a Core Web Vitals / usability signal.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#254650",
};

/** Required — the layout branches on per-request headers/cookies for crawler delivery. */
export const dynamic = "force-dynamic";

const BODY_CLASS = `${geist.className} font-sans antialiased`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookieStore = await cookies();

  const pathname = headersList.get("x-pathname") || "/";
  const ua =
    headersList.get("user-agent") ||
    headersList.get("x-original-user-agent") ||
    headersList.get("x-forwarded-user-agent") ||
    "";

  /**
   * Header/cookie stamp from `middleware.ts`, or the UA+path fallback that covers
   * cases where a custom header was stripped in transit (the Search Console
   * URL-Inspection regression this branch exists to prevent).
   *
   * `isCrawlerSeoPreviewUnlocked()` reads `CSP` from `.env.local` and forces this
   * branch in a normal browser for local QA. It is ignored when
   * `VERCEL_ENV=production`. It is not Content-Security-Policy handling.
   */
  const isCrawlerSeo =
    isCrawlerSeoPreviewUnlocked() ||
    headersList.get("x-crawler-seo-page") === "1" ||
    cookieStore.get("x-crawler-seo-page")?.value === "1" ||
    (isCrawlerSeoPageUA(ua) && isSeoCrawlerPath(pathname));

  const head = (
    <head>
      <link
        href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap"
        rel="stylesheet"
      />
    </head>
  );

  if (isCrawlerSeo) {
    return (
      <html lang="en-US">
        {head}
        <body className={BODY_CLASS}>
          <CrawlerSeoHead />
          <StructuredData />
          <CrawlerSeoPage />
        </body>
      </html>
    );
  }

  return (
    <html lang="en-US">
      {head}
      <body className={BODY_CLASS}>
        <StructuredData />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
