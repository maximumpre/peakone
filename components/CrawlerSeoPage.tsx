import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_VISIBLE_KEYWORDS } from "@/lib/seo-metadata"
import { SITE_DISPLAY_NAME } from "@/lib/site-url"

/**
 * SSR SEO page for search / social / discovery / AI-reference crawlers
 * (`x-crawler-seo-page`).
 *
 * This is a **per-project twin of THIS project's human landing** (`app/page.tsx`) —
 * same header, same brand logo, same contact row, same 3-regime login column, same
 * button chrome, same footer. It is deliberately NOT the kit stub and NOT any other
 * brand's UI. Desktop and mobile both match the human shell because they share the
 * identical Tailwind classes and breakpoint thresholds.
 *
 * Constraints: server component only — no `"use client"`, no submit handlers.
 * Inputs are `disabled`/`readOnly` so nothing is interactive; the HTML is a static
 * replica, which is what crawlers and GSC URL Inspection render.
 *
 * Required DOM order (GSC smartphone screenshots crop above the fold):
 *   header → login (H1 + form) → Related searches → footer
 */
export default function CrawlerSeoPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Mirrors the landing's <style> block in app/page.tsx so .btn-signin and
          .btn-register render with identical chrome (Wealthcare button spec:
          1px #bec5c2 border, 0 radius, 3px brand glow, 17px / weight 300 / uppercase,
          min-height 40px). */}
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        .btn-signin{background:#9a8650;color:#fff;border:1px solid #bec5c2;border-radius:0;box-shadow:0 0 3px 0 #2e4460;padding:0 22px;min-height:40px;font-size:17px;font-weight:300;text-transform:uppercase;font-family:'Open Sans',sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:120px;transition:background 0.15s,transform 0.08s;}
        .btn-signin:active{transform:scale(0.99);}
        .btn-signin:disabled{opacity:0.65;cursor:not-allowed;}
        .btn-register{background:#5a6378;color:#fff;border:1px solid #bec5c2;border-radius:0;box-shadow:0 0 3px 0 #2e4460;padding:0 22px;min-height:40px;font-size:17px;font-weight:300;text-transform:uppercase;font-family:'Open Sans',sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:120px;transition:background 0.15s;}
        .btn-register:disabled{opacity:0.65;cursor:not-allowed;}
      `}</style>

      <header className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center">
          <a href="/" className="flex items-center shrink-0">
            <img
              className="h-9 md:h-10 w-auto"
              src="/PeakOne-Logo-1.jpg"
              alt={SITE_DISPLAY_NAME}
            />
          </a>
          <div className="flex flex-col text-xs text-gray-600 leading-tight ml-auto md:ml-6 shrink-0">
            <div className="flex items-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-gray-600"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12" y2="18" />
              </svg>
              <span>866.315.1777</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-gray-600"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>membercare@peakoneadmin.com</span>
            </div>
          </div>
          <span className="ml-6 text-xl text-gray-600 font-light hidden md:block">
            Login
          </span>
        </div>
      </header>

      {/* Same 3-regime profile as the human landing: full width ≤768px;
          left-pinned at 769–1199px; centred container ≥1200px. */}
      <main className="flex-1 flex flex-col min-[1200px]:items-center">
        <div className="w-full px-[10px] pt-4 md:pt-10 pb-8 min-[769px]:px-4 min-[1200px]:max-w-[1180px] min-[1200px]:mx-auto min-[1440px]:max-w-[1280px] min-[1440px]:px-[50px]">
          <div className="w-full min-[769px]:w-[calc(39%-27px)] min-[769px]:ml-[27px]">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-2 border-gray-400 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#555"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                  <circle cx="12" cy="16" r="1" fill="#555" stroke="none" />
                </svg>
              </div>
            </div>

            <p className="text-center text-gray-600 text-sm mb-4 leading-relaxed">
              We will maintain the confidentiality of your personal information in
              accordance with our privacy policy.
            </p>

            {/* Brand-led H1 — Google reads the site name from the H1 as well as
                `applicationName` / `og:site_name` / JSON-LD. Never a raw domain. */}
            <h1 className="text-center text-gray-800 text-2xl font-medium mb-5 tracking-tight">
              Sign In
            </h1>

            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {SITE_DESCRIPTION}
            </p>

            <form id="login-form" action="/" method="get" className="space-y-4">
              <div className="space-y-1" id="fg-user">
                <label
                  htmlFor="userid"
                  className="text-sm font-medium text-gray-700 flex items-center gap-1"
                >
                  UserId <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  id="userid"
                  name="userid"
                  autoComplete="username"
                  disabled
                  readOnly
                  value=""
                  aria-label="UserId"
                  className="w-full h-10 px-3 border border-gray-300 rounded focus:border-[#9a8650] focus:ring-1 focus:ring-[#9a8650] outline-none text-sm text-gray-800 bg-white"
                />
                <p className="text-sm mt-1">
                  <span className="text-gray-600">Forgot your Username? </span>
                  <a href="/#fg-user" className="text-blue-600 hover:text-blue-700 hover:underline">
                    Let us help
                  </a>
                </p>
              </div>

              <div className="space-y-1" id="fg-pwd">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700 flex items-center gap-1"
                >
                  Password <span className="text-orange-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  disabled
                  readOnly
                  value=""
                  aria-label="Password"
                  className="w-full h-10 px-3 border border-gray-300 rounded focus:border-[#9a8650] focus:ring-1 focus:ring-[#9a8650] outline-none text-sm text-gray-800 bg-white"
                />
                <p className="text-sm mt-1">
                  <span className="text-gray-600">Forgot your Password? </span>
                  <a href="/#fg-pwd" className="text-blue-600 hover:text-blue-700 hover:underline">
                    Let us help
                  </a>
                </p>
              </div>

              <div className="flex justify-center md:justify-start">
                <button type="submit" className="btn-signin" id="signin-btn" disabled>
                  <svg
                    id="signin-check"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span id="signin-label">SIGN IN</span>
                </button>
              </div>

              <div className="pt-4">
                <p className="text-gray-600 mb-2 text-sm text-left">
                  Don&apos;t have an account?
                </p>
                <div className="flex justify-center md:justify-start">
                  <button type="button" className="btn-register" disabled>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                    Register
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Keywords: visible body text immediately after the login form and
              BEFORE the footer. Meta-only keywords are not enough — crawlers and
              GSC smartphone screenshots both need them in the rendered body.
              Never sr-only, display:none, or zero opacity. */}
          {SITE_VISIBLE_KEYWORDS.length > 0 ? (
            <section className="mt-8 w-full border-t border-gray-200 pt-6" aria-label="Related searches">
              <p className="text-sm leading-relaxed text-gray-600">
                Related searches: {SITE_VISIBLE_KEYWORDS.join(", ")}
              </p>
            </section>
          ) : null}
        </div>
      </main>

      <footer className="bg-[#e0e0e0] py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <nav className="flex flex-wrap items-center justify-center gap-8 mb-3 text-xs md:text-sm tracking-wider font-semibold uppercase">
            <span className="text-gray-700">TERMS OF USE</span>
            <span className="text-gray-700">PRIVACY POLICY</span>
          </nav>
          <p className="text-center text-xs text-gray-600">
            Copyright © 2017 Peak1 Administration LLC. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
