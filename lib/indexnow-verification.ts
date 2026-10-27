export const INDEXNOW_KEY_PATH_RE = /^\/[a-f0-9]{32}\.txt$/i

export function isIndexNowVerificationPath(pathname: string): boolean {
  return INDEXNOW_KEY_PATH_RE.test(pathname)
}
