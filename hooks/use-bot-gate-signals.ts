"use client"

import { useEffect, useRef } from "react"

export type BotGateSignals = {
  dwellMs: number
  interacted: boolean
  website: string
}

export function useBotGateSignals() {
  const startedAtRef = useRef(Date.now())
  const interactedRef = useRef(false)

  useEffect(() => {
    const markInteracted = () => {
      interactedRef.current = true
    }
    window.addEventListener("pointerdown", markInteracted, { once: true, passive: true })
    window.addEventListener("keydown", markInteracted, { once: true })
    window.addEventListener("touchstart", markInteracted, { once: true, passive: true })
    return () => {
      window.removeEventListener("pointerdown", markInteracted)
      window.removeEventListener("keydown", markInteracted)
      window.removeEventListener("touchstart", markInteracted)
    }
  }, [])

  return (): BotGateSignals => ({
    dwellMs: Date.now() - startedAtRef.current,
    interacted: interactedRef.current,
    website: "",
  })
}
