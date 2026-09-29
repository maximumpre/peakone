import { NextRequest, NextResponse, after } from "next/server"
import { isMitigationBand } from "@/lib/bot-risk/score"
import { resolveRequestRisk } from "@/lib/bot-risk/resolve"
import { getPendingLogin } from '@/lib/pending-logins'
import { claimAndSendAdminLoginOutcome } from '@/lib/pending-login-outcome-notify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const risk = await resolveRequestRisk(request)
    if (isMitigationBand(risk.band)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const record = await getPendingLogin(id)
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    after(async () => {
      try {
        await claimAndSendAdminLoginOutcome(id)
      } catch (notifyErr) {
        console.error("[pending-login] admin outcome notify:", notifyErr)
      }
    })

    return NextResponse.json({
      id: record.id,
      status: record.status,
      method: record.method,
    })
  } catch (error) {
    console.error('[pending-login] GET error:', error)
    return NextResponse.json({ error: 'Failed to get pending login' }, { status: 500 })
  }
}
