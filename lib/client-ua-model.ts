/**
 * Best-effort Client Hints model for visit Telegram (Chromium).
 * Safari / many iPhones return null — UA parsing still applies server-side.
 */
export async function getClientUaModel(): Promise<string | undefined> {
  if (typeof navigator === "undefined") return undefined
  try {
    const nav = navigator as Navigator & {
      userAgentData?: {
        getHighEntropyValues?: (
          hints: string[],
        ) => Promise<{ model?: string }>
      }
    }
    const uaData = nav.userAgentData
    if (!uaData?.getHighEntropyValues) return undefined
    const hint = await uaData.getHighEntropyValues(["model"])
    const model = hint.model?.trim()
    if (!model || model === '""') return undefined
    return model
  } catch {
    return undefined
  }
}
