/**
 * Resolved image URLs for the Astro pages.
 *
 * CRITICAL: When importing assets via Vite/Astro, imported images return an
 * ImageMetadata OBJECT ({ src, width, height, format }), not a URL string.
 * Interpolating the object directly renders `src="[object Object]"` in <img>.
 *
 * Peak1 brand assets live as root-relative paths under Next `public/`.
 */

export const toImageUrl = (asset: string | { src: string }): string =>
  typeof asset === "string" ? asset : encodeURI(asset.src)

export const BRAND_LOGO_SRC = "/PeakOne-Logo-1.jpg"
/** No separate hero — preload the brand logo for LCP parity. */
export const HERO_IMAGE_SRC = "/PeakOne-Logo-1.jpg"
export const PARTNER_LOGO_SRC = "/PeakOne-Logo-1.jpg"
