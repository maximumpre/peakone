import { permanentRedirect } from "next/navigation"

/**
 * Legacy `/login` — permanent redirect to homepage so crawlers do not index a competing URL.
 * Login UI lives at `/` (Astro hybrid `public/index.html`).
 */
export default function LoginRedirectPage() {
  permanentRedirect("/")
}
