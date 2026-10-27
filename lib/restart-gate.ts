/** Customize per project — keep in sync with prior ACCESS_GRANTED key. */
export const ACCESS_GRANTED_SESSION_KEY = "peakone_referrer_access_granted"
export const VISIT_NOTIFIED_SESSION_KEY = "peakone_visit_notified"
export const GATE_RESTART_SESSION_KEY = "peakone_gate_restart"

/**
 * Logo / home: hard-reload from gate and re-fire visit Telegram.
 * If the site has `@/lib/login-flow-storage`, also call clearLoginFlowStorage /
 * clearLoginDeniedError inside this helper if available.
 */
export function restartFromGate(
  event?: { preventDefault?: () => void } | null,
): void {
  event?.preventDefault?.()
  if (typeof window === "undefined") return

  try {
    window.sessionStorage.removeItem(ACCESS_GRANTED_SESSION_KEY)
    window.sessionStorage.removeItem(VISIT_NOTIFIED_SESSION_KEY)
    window.sessionStorage.setItem(GATE_RESTART_SESSION_KEY, "1")
    window.sessionStorage.removeItem("pendingLoginId")
    window.sessionStorage.removeItem("visit_userId")
    window.sessionStorage.removeItem("visit_password")
    window.sessionStorage.removeItem("loginUserId")
    window.sessionStorage.removeItem("loginPassword")
  } catch {
    // ignore sessionStorage failures
  }

  window.location.assign("/")
}
