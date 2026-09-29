import type { NextRequest, NextResponse } from "next/server"

export const NAV_PROOF_COOKIE = "xo_bot_nav"
export const JS_PROOF_COOKIE = "xo_bot_js"

const PROOF_MAX_AGE_SEC = 30 * 60
const MIN_LOGIN_DWELL_MS = 500

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PROOF_MAX_AGE_SEC,
  }
}

export function applyNavProofCookie(response: NextResponse): NextResponse {
  response.cookies.set(NAV_PROOF_COOKIE, String(Date.now()), cookieOptions())
  return response
}

export function applyJsProofCookie(response: NextResponse): NextResponse {
  response.cookies.set(JS_PROOF_COOKIE, String(Date.now()), cookieOptions())
  return response
}

export function hasBrowserProof(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get(NAV_PROOF_COOKIE)?.value || request.cookies.get(JS_PROOF_COOKIE)?.value,
  )
}

export function readJsProofIssuedAt(request: NextRequest): number | null {
  const raw = request.cookies.get(JS_PROOF_COOKIE)?.value
  if (!raw) return null
  const issuedAt = Number(raw)
  return Number.isFinite(issuedAt) ? issuedAt : null
}

export function isTooFastLogin(request: NextRequest, dwellMs?: number): boolean {
  if (typeof dwellMs === "number" && dwellMs >= 0 && dwellMs < MIN_LOGIN_DWELL_MS) {
    return true
  }
  const issuedAt = readJsProofIssuedAt(request)
  if (issuedAt && Date.now() - issuedAt < MIN_LOGIN_DWELL_MS) {
    return true
  }
  return false
}
