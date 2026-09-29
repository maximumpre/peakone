import type { NextRequest, NextResponse } from "next/server"

import { type RiskBand, ttlMsForBand } from "./score"

export const RISK_COOKIE_NAME = "xo_bot_risk"

const BANDS = new Set<RiskBand>(["allow", "watch", "challenge", "block"])

export type ParsedRiskCookie = {
  band: RiskBand
  score: number
  expiresAtMs: number
}

export function parseRiskCookieValue(raw: string | undefined | null): ParsedRiskCookie | null {
  if (!raw?.trim()) return null
  const [bandRaw, scoreRaw, expRaw] = raw.split(":")
  if (!bandRaw || !BANDS.has(bandRaw as RiskBand)) return null
  const score = Number(scoreRaw)
  const expiresAtMs = Number(expRaw)
  if (!Number.isFinite(score) || !Number.isFinite(expiresAtMs)) return null
  if (expiresAtMs <= Date.now()) return null
  return {
    band: bandRaw as RiskBand,
    score: Math.max(0, Math.min(100, Math.round(score))),
    expiresAtMs,
  }
}

export function serializeRiskCookieValue(band: RiskBand, score: number, expiresAtMs: number): string {
  return `${band}:${Math.max(0, Math.min(100, Math.round(score)))}:${expiresAtMs}`
}

export function readRiskCookie(request: NextRequest): ParsedRiskCookie | null {
  return parseRiskCookieValue(request.cookies.get(RISK_COOKIE_NAME)?.value)
}

export function applyRiskCookie(
  response: NextResponse,
  band: RiskBand,
  score: number,
): NextResponse {
  const ttlMs = ttlMsForBand(band)
  if (band === "allow" || ttlMs <= 0) {
    response.cookies.delete(RISK_COOKIE_NAME)
    return response
  }

  const expiresAtMs = Date.now() + ttlMs
  response.cookies.set(RISK_COOKIE_NAME, serializeRiskCookieValue(band, score, expiresAtMs), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil(ttlMs / 1000),
  })
  return response
}
