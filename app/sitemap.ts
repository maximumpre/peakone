import type { MetadataRoute } from "next";

import { SITE_CONTENT_UPDATED_AT, SITE_HOMEPAGE_URL } from "@/lib/site-url";

/**
 * Only the homepage is intended for search indexing. Gated verification routes
 * (`/verify`, `/verify-choice`, `/blocked`) and `/api/*` are disallowed in
 * `app/robots.txt/route.ts` and must never be listed here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_HOMEPAGE_URL,
      lastModified: SITE_CONTENT_UPDATED_AT,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
