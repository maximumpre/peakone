"use client";

import React from "react";

export function SiteHeader() {
  return (
    <header className="sticky-header shadow-sm bg-white border-b border-gray-300 z-50">
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <img src="/download.png" alt="Peak1 logo" className="h-12 w-auto" />

          <div className="flex flex-col gap-2 text-sm text-gray-600 sm:border-l sm:pl-6 border-gray-300">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              800-532-3327
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              customerservice@peak1.wealthcareportal.com
            </div>
          </div>
        </div>

        <div className="hidden md:block text-3xl font-light text-gray-500">
          Login
        </div>
      </div>
    </header>
  );
}
