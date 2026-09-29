import { applyRiskCookie } from "./cookie"
import { ttlMsForBand } from "./score"
import { upsertIpRisk } from "./store"

import type { NextResponse } from "next/server"

export async function forceBlockIp(
  ip: string,
  flags: string[],
  userAgent: string,
): Promise<void> {
  await upsertIpRisk({
    ip,
    score: 100,
    band: "block",
    flags,
    userAgent,
    expiresAtMs: Date.now() + ttlMsForBand("block"),
  })
}

export function applyForcedBlockCookie(response: NextResponse): NextResponse {
  return applyRiskCookie(response, "block", 100)
}
