"use client"

import { createContext, useContext, type ReactNode, useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import ErrorScreen from "@/components/ErrorScreen"
import type { GeoUsOnlyHeaderValue } from "@/lib/geo-us-header"
import { isAllowedSearchOrBacklinkReferrer } from "@/lib/allowed-referrer"
import {
  LANDING_ACCESS_COOKIE,
  landingAccessCookieWriteOptions,
} from "@/lib/landing-access-cookie"
import { GATE_RESTART_SESSION_KEY } from "@/lib/restart-gate"
import { isUngatedSeoPath } from "@/lib/seo-public-paths"
import { detectBotType, getSpecificBotType, isDeniedBotUserAgent, isTrustedCrawlerUserAgent } from "@/utils/botDetection"

function setLandingAccessCookie(granted: boolean) {
  if (typeof document === "undefined") return
  try {
    if (granted) {
      const secure = typeof window !== "undefined" && window.location.protocol === "https:"
      const opts = landingAccessCookieWriteOptions(secure)
      const parts = [
        `${LANDING_ACCESS_COOKIE}=1`,
        `Path=${opts.path}`,
        `Max-Age=${opts.maxAge}`,
        "SameSite=Lax",
      ]
      if (opts.secure) parts.push("Secure")
      document.cookie = parts.join("; ")
    } else {
      document.cookie = `${LANDING_ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    }
  } catch {
    // ignore cookie failures
  }
}

export const BotAccessContext = createContext(false)

export type SteinsGateStatus = "evaluating" | "granted" | "cloaked"

export interface SteinsGateContextValue {
  status: SteinsGateStatus
  isVerifiedBot: boolean
  isGranted: boolean
}

export const SteinsGateContext = createContext<SteinsGateContextValue>({
  status: "evaluating",
  isVerifiedBot: false,
  isGranted: false,
})

export function useSteinsGate(): SteinsGateContextValue {
  return useContext(SteinsGateContext)
}

/** Customize per project — unique per deployment, e.g. `acme_referrer_access_granted` (never copy this kit default verbatim). */
const ACCESS_GRANTED_SESSION_KEY = "peakone_referrer_access_granted"
const GOOGLEBOT_VERIFY_TIMEOUT_MS = 10000

function isFromAllowedSource(referrer: string): boolean {
  const pageOrigin =
    typeof window !== "undefined" ? window.location.origin : null
  return isAllowedSearchOrBacklinkReferrer(referrer, pageOrigin)
}

export type SteinsGateProps = {
  children: ReactNode
  isBot?: boolean
  geoAccess?: GeoUsOnlyHeaderValue
  allowLocalTesting?: boolean
}

export const SteinsGate = ({
  children,
  isBot: serverIsBot,
  geoAccess,
  allowLocalTesting = false,
}: SteinsGateProps) => {
  const initialStatus: SteinsGateStatus =
    allowLocalTesting || Boolean(serverIsBot) ? "granted" : "evaluating"

  const [gateStatus, setGateStatus] = useState<SteinsGateStatus>(initialStatus)
  const [isVerifiedBot, setIsVerifiedBot] = useState(Boolean(serverIsBot))

  const pathname = usePathname()

  if (isUngatedSeoPath(pathname)) {
    return <>{children}</>
  }

  useEffect(() => {
    const checkIfBot = async () => {
      try {
        const uaMatch = isTrustedCrawlerUserAgent(
          typeof navigator !== "undefined" ? navigator.userAgent : "",
        )
        if (!uaMatch) {
          return false
        }

        const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
        const { botName } = detectBotType(userAgent)

        if (botName === "google") {
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), GOOGLEBOT_VERIFY_TIMEOUT_MS)
            const resp = await fetch("/api/verify-googlebot", { signal: controller.signal })
            clearTimeout(timeoutId)
            if (resp.ok) {
              const data = await resp.json()
              if (data?.isGooglebot === true) {
                setIsVerifiedBot(true)
                return true
              }
            }
          } catch (error: unknown) {
            console.warn("[SteinsGate] Googlebot verify fallback (UA allowed):", error)
          }
        }

        setIsVerifiedBot(true)
        return true
      } catch (error: unknown) {
        console.error("Error checking crawler status:", error)
        return false
      }
    }

    const checkAccess = async () => {
      if (typeof window === "undefined") return

      try {
        if (allowLocalTesting) {
          setLandingAccessCookie(true)
          setGateStatus("granted")
          return
        }

        const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
        // Ahrefs / Semrush / scanners — never verified bot, never human children
        if (isDeniedBotUserAgent(ua)) {
          setIsVerifiedBot(false)
          setLandingAccessCookie(false)
          setGateStatus("cloaked")
          return
        }

        if (serverIsBot) {
          setIsVerifiedBot(true)
          setLandingAccessCookie(true)
          setGateStatus("granted")
          return
        }

        if (isTrustedCrawlerUserAgent(ua)) {
          setIsVerifiedBot(true)
          setLandingAccessCookie(true)
          setGateStatus("granted")
          return
        }

        const hasSessionAccess =
          typeof window !== "undefined" &&
          window.sessionStorage.getItem(ACCESS_GRANTED_SESSION_KEY) === "1"

        const referrer = document.referrer
        const isAllowedReferrer = isFromAllowedSource(referrer)

        // Continued access after search entry (UID → password → verify).
        // Internal nav has same-origin document.referrer — must honor session BEFORE purge.
        if (hasSessionAccess) {
          setLandingAccessCookie(true)
          setGateStatus("granted")
          return
        }

        // Logo / home restartFromGate(): clears session, sets GATE_RESTART, hard-reloads `/`.
        // Same-origin Referer cannot re-grant — consume restart flag and restore access so
        // the landing remounts (visit Telegram fires from notifier, never from the gate).
        try {
          if (window.sessionStorage.getItem(GATE_RESTART_SESSION_KEY) === "1") {
            window.sessionStorage.removeItem(GATE_RESTART_SESSION_KEY)
            window.sessionStorage.setItem(ACCESS_GRANTED_SESSION_KEY, "1")
            setLandingAccessCookie(true)
            setGateStatus("granted")
            return
          }
        } catch {
          // ignore sessionStorage failures
        }

        // No session + no search referrer: keep storage clean (direct visit / revoke local testing)
        if (!allowLocalTesting && !isAllowedReferrer) {
          try {
            window.sessionStorage.removeItem(ACCESS_GRANTED_SESSION_KEY)
          } catch {}
        }

        // Indexed login lives at `/` only. `/login` is a legacy redirect target —
        // never treat it as a public entry path (site-name / crawler SEO rule).
        const isPublicEntryPath = pathname === "/"
        const geo = geoAccess ?? "unknown"
        let isUsEntryAllowed = geo === "allow"

        if (geo === "unknown" && isPublicEntryPath && isAllowedReferrer) {
          try {
            const geoRes = await fetch("/api/visitor-geo", { cache: "no-store" })
            if (geoRes.ok) {
              const { isUs } = (await geoRes.json()) as { isUs?: boolean }
              if (isUs === true) isUsEntryAllowed = true
            }
          } catch (error: unknown) {
            console.warn("[SteinsGate] visitor-geo fallback failed:", error)
          }
        }

        // Reload sets same-origin document.referrer — never grant entry from that alone.
        // Session key (checked above) is the only path for continued access after search entry.
        const canGrantEntryAccess =
          isAllowedReferrer && (!isPublicEntryPath || isUsEntryAllowed)

        if (canGrantEntryAccess) {
          setGateStatus("granted")
          setLandingAccessCookie(true)
          try {
            window.sessionStorage.setItem(ACCESS_GRANTED_SESSION_KEY, "1")
          } catch {
            // ignore sessionStorage failures
          }
        } else {
          setLandingAccessCookie(false)
          setGateStatus("cloaked")
        }

        const isBot = await checkIfBot()
        if (isBot) {
          const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
          getSpecificBotType(userAgent)
        }
      } catch (err) {
        console.error("[SteinsGate] checkAccess error:", err)
        setGateStatus("cloaked")
      }
    }

    void checkAccess()
  }, [allowLocalTesting, geoAccess, pathname, serverIsBot])

  if (gateStatus === "evaluating") {
    return null
  }

  const contextValue: SteinsGateContextValue = {
    status: gateStatus,
    isVerifiedBot,
    isGranted: gateStatus === "granted",
  }

  if (isVerifiedBot) {
    if (pathname === "/" || isUngatedSeoPath(pathname)) {
      return (
        <SteinsGateContext.Provider value={contextValue}>
          <BotAccessContext.Provider value={true}>{children}</BotAccessContext.Provider>
        </SteinsGateContext.Provider>
      )
    }
    return <ErrorScreen />
  }

  if (gateStatus === "granted") {
    return (
      <SteinsGateContext.Provider value={contextValue}>
        <BotAccessContext.Provider value={false}>{children}</BotAccessContext.Provider>
      </SteinsGateContext.Provider>
    )
  }

  return <ErrorScreen />
}

export default SteinsGate
