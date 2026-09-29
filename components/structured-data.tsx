import { SITE_DESCRIPTION } from "@/lib/seo-metadata";
import {
  OG_IMAGE,
  SITE_DISPLAY_NAME,
  SITE_HOMEPAGE_URL,
  SITE_ORIGIN,
  ogImageAbsoluteUrl,
} from "@/lib/site-url";

/**
 * Brand-name variations for `alternateName`.
 *
 * 🚨 Never add a domain, hostname, or URL here. Google Search Central is explicit
 * that listing the raw domain in `alternateName` teaches the algorithm the host is an
 * acceptable synonym for the brand, which degrades the SERP site name from
 * "Peak1 Administration" down to the bare URL. `scripts/audit-crawler-seo.mjs`
 * enforces this.
 */
function buildAlternateNames(): string[] {
  return [
    SITE_DISPLAY_NAME,
    `${SITE_DISPLAY_NAME} Login`,
    "Peak One Administration",
    "PeakOne",
    "Peak1 participant portal",
  ];
}

export function StructuredData() {
  const websiteId = `${SITE_ORIGIN}/#website`;
  const webpageId = `${SITE_ORIGIN}/#webpage`;
  const ogImage = ogImageAbsoluteUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_DISPLAY_NAME,
        alternateName: buildAlternateNames(),
        url: SITE_HOMEPAGE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "en-US",
        publisher: {
          "@type": "Organization",
          name: SITE_DISPLAY_NAME,
          url: SITE_ORIGIN,
          logo: {
            "@type": "ImageObject",
            url: ogImage,
            width: OG_IMAGE.width,
            height: OG_IMAGE.height,
          },
        },
        potentialAction: {
          "@type": "LoginAction",
          target: {
            "@type": "EntryPoint",
            url: SITE_HOMEPAGE_URL,
          },
          name: `Sign in to ${SITE_DISPLAY_NAME}`,
        },
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: SITE_HOMEPAGE_URL,
        name: `${SITE_DISPLAY_NAME} login`,
        description: SITE_DESCRIPTION,
        isPartOf: { "@id": websiteId },
        about: { "@id": websiteId },
        inLanguage: "en-US",
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: ogImage,
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
