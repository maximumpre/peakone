export const YANDEX_VERIFICATION_PATH_RE = /^\/yandex_[0-9a-f]+\.html$/i

export function isYandexVerificationPath(pathname: string): boolean {
  return YANDEX_VERIFICATION_PATH_RE.test(pathname)
}
