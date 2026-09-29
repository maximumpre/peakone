import { NextResponse } from "next/server";

/** Peak1 member-site handshake — the final hand-off after an approved gate. */
export const PEAK1_HANDSHAKE_URL =
  "https://peak1.wealthcareportal.com/Authentication/Handshake";

export async function GET() {
  const redirectUrl =
    process.env.LOGIN_REDIRECT_URL?.trim() || PEAK1_HANDSHAKE_URL;
  const safeUrl = redirectUrl
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0;url=${safeUrl}"/><script>window.top.location.href=${JSON.stringify(redirectUrl)};</script></head><body>Redirecting…</body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
