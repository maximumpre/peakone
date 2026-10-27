import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { isGoogleCrawlerUA } from "@/lib/bot-detection"
import { getClientIpFromRequest } from "@/lib/client-ip"
import { getBotRegistryEntry } from "@/lib/bot-verification/bot-registry"
import { verifyBotRequest } from "@/lib/bot-verification/verify-bot"

export async function GET(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? ""
  if (!isGoogleCrawlerUA(ua)) {
    return NextResponse.json(
      { isGooglebot: false },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  const entry = getBotRegistryEntry("googlebot")
  if (!entry) {
    return NextResponse.json(
      { isGooglebot: false },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  const ip = getClientIpFromRequest(request)
  if (!ip) {
    return NextResponse.json(
      { error: "Could not determine IP" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    )
  }

  const forceFull = process.env.VERIFY_FULL === "true"
  if (
    !forceFull &&
    (process.env.NODE_ENV === "development" ||
      ip === "127.0.0.1" ||
      ip === "::1")
  ) {
    return NextResponse.json(
      { isGooglebot: true },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  const result = await verifyBotRequest(ip, entry)
  return NextResponse.json(
    { isGooglebot: result.status === "VERIFIED" },
    { headers: { "Cache-Control": "no-store" } },
  )
}
