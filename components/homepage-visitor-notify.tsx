"use client";

import { useEffect, useRef } from "react";

import { getClientUaModel } from "@/lib/client-ua-model";
import { VISIT_NOTIFIED_SESSION_KEY } from "@/lib/restart-gate";

const visitNotifyInFlight = new Set<string>();

/**
 * Ops visit Telegram — landing mount only (authorized sessions behind SteinsGate).
 * Direct / denied sessions never mount this wrapper.
 */
export function HomepageVisitorNotify({
  children,
}: {
  children: React.ReactNode;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current || typeof window === "undefined") return;
    sentRef.current = true;

    const sessionKey = VISIT_NOTIFIED_SESSION_KEY;
    try {
      if (window.sessionStorage.getItem(sessionKey) === "1") return;
    } catch {
      // ignore sessionStorage failures
    }
    if (visitNotifyInFlight.has(sessionKey)) return;
    visitNotifyInFlight.add(sessionKey);

    void (async () => {
      const uaModel = await getClientUaModel();
      void fetch("/api/telegram/visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAgent: navigator.userAgent,
          ...(uaModel ? { uaModel } : {}),
          screen: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
          referrer: document.referrer || "Direct",
          pageUrl: window.location.href,
        }),
        keepalive: true,
      })
        .then(async (res) => {
          if (!res.ok) return;
          try {
            const data = (await res.json()) as { telegramSent?: boolean };
            if (data.telegramSent !== true) return;
            window.sessionStorage.setItem(sessionKey, "1");
          } catch {
            // ignore
          }
        })
        .catch(() => {})
        .finally(() => {
          visitNotifyInFlight.delete(sessionKey);
        });
    })();
  }, []);

  return <>{children}</>;
}
