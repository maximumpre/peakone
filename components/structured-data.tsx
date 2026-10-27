import { SITE_DESCRIPTION } from "@/lib/seo-metadata";
import {
  OG_IMAGE,
  SITE_DISPLAY_NAME,
  SITE_HOMEPAGE_CANONICAL,
  SITE_ORIGIN,
  canonicalHostFromOrigin,
  ogImageAbsoluteUrl,
} from "@/lib/site-url";

/**
 * Brand-name variations for `alternateName`.
 *
 * Brand phrases first; the bare lowercase host goes LAST — Google's documented
 * fallback when it cannot map the brand to a site name. Descriptions, titles and
 * the `<h1>` stay domain-free. `scripts/audit-crawler-seo.mjs` enforces this.
 */
function buildAlternateNames(): string[] {
  return [
    "Peak One Administration",
    "PeakOne",
    `${SITE_DISPLAY_NAME} Login`,
    "Peak1 participant portal",
    canonicalHostFromOrigin().toLowerCase(),
  ];
}

export function StructuredData() {
  const websiteId = `${SITE_HOMEPAGE_CANONICAL}#website`;
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const breadcrumbId = `${SITE_HOMEPAGE_CANONICAL}#breadcrumb`;
  const ogImage = ogImageAbsoluteUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_DISPLAY_NAME,
        alternateName: buildAlternateNames(),
        url: SITE_HOMEPAGE_CANONICAL,
        description: SITE_DESCRIPTION,
        inLanguage: "en-US",
        publisher: { "@id": organizationId },
        potentialAction: {
          "@type": "LoginAction",
          target: {
            "@type": "EntryPoint",
            url: SITE_HOMEPAGE_CANONICAL,
          },
          name: `Sign in to ${SITE_DISPLAY_NAME}`,
        },
      },
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_DISPLAY_NAME,
        url: SITE_ORIGIN,
        logo: {
          "@type": "ImageObject",
          url: ogImage,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_HOMEPAGE_CANONICAL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Sign In",
            item: SITE_HOMEPAGE_CANONICAL,
          },
        ],
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

export const SeoJsonLd = StructuredData;
