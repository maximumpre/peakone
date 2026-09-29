import { NextRequest, NextResponse } from "next/server"
import { telegramService } from "@/lib/telegram"
import {
  parseVisitorInfo,
  type VisitorClientHints,
} from "@/lib/parse-visitor-os"

type BotDetectionResult = {
  isBot: boolean
  name: string
  type: string
  matchedPatterns: string[]
}

function detectBot(userAgent: string | undefined | null): BotDetectionResult {
  if (!userAgent) {
    return { isBot: false, name: "", type: "", matchedPatterns: [] }
  }

  const ua = userAgent.toLowerCase()

  const patterns: { pattern: string; name: string; type: string }[] = [
    { pattern: "googlebot", name: "Googlebot", type: "Search crawler" },
    { pattern: "bingbot", name: "Bingbot", type: "Search crawler" },
    { pattern: "slurp", name: "Yahoo Slurp", type: "Search crawler" },
    { pattern: "duckduckbot", name: "DuckDuckBot", type: "Search crawler" },
    { pattern: "baiduspider", name: "Baidu Spider", type: "Search crawler" },
    { pattern: "yandexbot", name: "YandexBot", type: "Search crawler" },
    { pattern: "facebookexternalhit", name: "Facebook Crawler", type: "Link preview" },
    { pattern: "twitterbot", name: "Twitterbot", type: "Link preview" },
    { pattern: "telegrambot", name: "TelegramBot", type: "Link preview" },
    { pattern: "whatsapp", name: "WhatsApp", type: "Link preview" },
    { pattern: "discordbot", name: "DiscordBot", type: "Link preview" },
    { pattern: "linkedinbot", name: "LinkedInBot", type: "Link preview" },
    { pattern: "curl", name: "curl", type: "CLI HTTP client" },
    { pattern: "wget", name: "wget", type: "CLI HTTP client" },
    { pattern: "python-requests", name: "python-requests", type: "Script / HTTP client" },
    { pattern: "httpclient", name: "HTTP client", type: "Script / HTTP client" },
    { pattern: "node-fetch", name: "node-fetch", type: "Script / HTTP client" },
    { pattern: "axios", name: "axios", type: "Script / HTTP client" },
    { pattern: "postmanruntime", name: "Postman", type: "API client" },
    { pattern: "insomnia", name: "Insomnia", type: "API client" },
    { pattern: "headless", name: "Headless browser", type: "Automation / testing" },
    { pattern: "puppeteer", name: "Puppeteer", type: "Automation / testing" },
    { pattern: "selenium", name: "Selenium", type: "Automation / testing" },
    { pattern: "playwright", name: "Playwright", type: "Automation / testing" },
    { pattern: "bot", name: "Generic bot", type: "Crawler / bot" },
    { pattern: "spider", name: "Spider", type: "Crawler / bot" },
    { pattern: "crawl", name: "Crawler", type: "Crawler / bot" },
  ]

  const matched = patterns.filter((p) => ua.includes(p.pattern))

  if (matched.length === 0) {
    return { isBot: false, name: "", type: "", matchedPatterns: [] }
  }

  const primary = matched[0]
  const matchedPatterns = Array.from(new Set(matched.map((m) => m.pattern)))

  return {
    isBot: true,
    name: primary.name,
    type: primary.type,
    matchedPatterns,
  }
}

function getClientIp(request: NextRequest): string {
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for")
  if (vercelForwardedFor) return vercelForwardedFor.split(",")[0]?.trim() || ""

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()

  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || ""

  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp.trim()

  return ""
}

type GeoInfo = {
  location?: string
  timezone?: string
  isp?: string
  asn?: string
  org?: string
}

async function enrichWithGeo(request: NextRequest, ip: string): Promise<GeoInfo> {
  const vercelCity = request.headers.get("x-vercel-ip-city")
  const vercelRegion = request.headers.get("x-vercel-ip-country-region")
  const vercelCountry = request.headers.get("x-vercel-ip-country")
  const vercelTimezone = request.headers.get("x-vercel-ip-timezone")
  const vercelLocation = [vercelCity, vercelRegion, vercelCountry].filter(Boolean).join(", ")

  if (vercelLocation || vercelTimezone) {
    return {
      location: vercelLocation || undefined,
      timezone: vercelTimezone || undefined,
    }
  }

  if (!ip) return {}
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      method: "GET",
      cache: "no-store",
    })
    if (!res.ok) return {}
    const geo = await res.json()
    return {
      location: [geo?.city, geo?.region, geo?.country_name].filter(Boolean).join(", ") || undefined,
      timezone: geo?.timezone || undefined,
      isp: geo?.org || undefined,
      asn: typeof geo?.asn === "string" ? geo.asn : undefined,
      org: geo?.org || undefined,
    }
  } catch {
    return {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const ip = getClientIp(request) || data.ip || ""
    const geo = await enrichWithGeo(request, ip)

    const botInfo = detectBot(data.userAgent)

    // Parse the UA into Platform / Browser / Device. The visitor template must
    // never dump the raw UA string (Testing 2 catalog §1).
    const hints: VisitorClientHints = {
      mobile: request.headers.get("sec-ch-ua-mobile") === "?1",
      platform: request.headers.get("sec-ch-ua-platform") ?? undefined,
      platformVersion: request.headers.get("sec-ch-ua-platform-version") ?? undefined,
      model: request.headers.get("sec-ch-ua-model") ?? undefined,
    }
    const parsed = parseVisitorInfo(data.userAgent || "", hints)

    const updatedData = {
      ...data,
      ip: ip || data.ip || "Unknown",
      location: geo.location || data.location || "Unknown",
      timezone: geo.timezone || data.timezone || "Unknown",
      isp: geo.isp || data.isp || "Unknown",
      referrer: botInfo.isBot ? `🤖 BOT (${botInfo.name})` : data.referrer,
      platformLabel: parsed.platformLabel,
      browserLabel: parsed.browserLabel,
      deviceLabel: parsed.deviceLabel,
      asn: (data.asn ?? geo.asn) as string | null | undefined,
      org: (data.org ?? geo.org) as string | null | undefined,
    }

    await telegramService.sendVisitorNotification(updatedData)

    if (botInfo.isBot) {
      let path = "/"
      if (typeof data.url === "string" && data.url.length > 0) {
        try {
          const urlObj = new URL(data.url)
          path = urlObj.pathname || "/"
        } catch {
          path = "/"
        }
      }

      await telegramService.sendBotVisitNotification({
        name: botInfo.name,
        type: botInfo.type,
        userAgent: data.userAgent,
        ip: data.ip,
        path,
        matchedPatterns: botInfo.matchedPatterns,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending visitor notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}

