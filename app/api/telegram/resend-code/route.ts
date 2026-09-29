import { NextRequest, NextResponse } from "next/server"
import { telegramService } from "@/lib/telegram"
import { getClientIp } from "@/lib/request-ip"

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    await telegramService.sendResendCodeNotification(ip)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to send resend code notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
