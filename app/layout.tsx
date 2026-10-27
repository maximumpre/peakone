import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

import ProtectedLayout from "@/components/protected-layout"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TITLE } from "@/lib/seo-metadata"
import { INDEXABLE_PAGE_ROBOTS } from "@/lib/seo-robots-metadata"
import {
  OG_IMAGE,
  SITE_DISPLAY_NAME,
  SITE_HOMEPAGE_CANONICAL,
  ogImageAbsoluteUrl,
} from "@/lib/site-url"

const geist = Geist({ subsets: ["latin"] })

const OG_IMAGE_URL = ogImageAbsoluteUrl()

/**
 * Remaining Next routes (`/verify*`, `/blocked`, …) still render through this layout.
 * `/` is owned by Astro (`public/index.html` / `public/crawler-seo.html`).
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
    "msapplication-TileImage": "/icon-48x48.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#254650",
}

export const dynamic = "force-dynamic"

const BODY_CLASS = `${geist.className} font-sans antialiased`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-US">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={BODY_CLASS}>
        <SeoJsonLd />
        <ProtectedLayout>{children}</ProtectedLayout>
        <Analytics />
      </body>
    </html>
  )
}
