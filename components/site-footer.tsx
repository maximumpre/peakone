"use client";

/** Peak1 tenant footer — extracted from the landing so every step reuses it
 *  verbatim instead of hardcoding the markup per page. */
export function SiteFooter() {
  return (
    <footer className="bg-[#e0e0e0] py-6 px-6">
      <div className="max-w-7xl mx-auto">
        <nav className="flex flex-wrap items-center justify-center gap-8 mb-3 text-xs md:text-sm tracking-wider font-semibold uppercase">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-gray-700 hover:text-gray-900 hover:underline"
          >
            TERMS OF USE
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-gray-700 hover:text-gray-900 hover:underline"
          >
            PRIVACY POLICY
          </a>
        </nav>
        <p className="text-center text-xs text-gray-600">
          Copyright © 2017 Peak1 Administration LLC. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
