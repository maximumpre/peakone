# Peak1 Administration Member Portal

Peak1 Administration member portal login and verification experience.

## Changelog

### 2026-09-29 — Adopt the Wealthcare method/OTP spec + admin approval gate
Rebuilt the sign-in flow to the shared Wealthcare spec (igoe and the Sleipnir kit are the source of truth) and added the admin approval gate. Scope is **login → method → passcode** only.

**Gate (new — this is what makes the loading state mean something)**
- Ported the kit's approval gate: `POST /api/pending-login` + `GET /api/pending-login/[id]`, `lib/pending-logins.ts`, `db.ts`, `cc-id.ts`, `database-urls.ts`, `project-config.ts`, `approval-messages.ts`, `poll-pending-login.ts`, `admin-login-outcome.ts`, `pending-login-outcome-notify.ts`, `member-origin.ts`, `client-ip.ts`, `local-testing.ts`, `site-url.ts`, `site-id.ts`, and the `bot-risk/*` + `datacenter-heuristic` closure (28 files).
- Added `app/api/login-out/route.ts` — post-approval hand-off to the Peak1 handshake URL (`LOGIN_REDIRECT_URL` override).
- Gate 1 fires on the method page's **Generate Code** (`flow: "login"`); Gate 2 on the passcode page's **Continue** (`flow: "otp"`). Both poll for up to `APPROVAL_TIMEOUT_MS` (90s); `approved`/`redirected` proceed, `denied` shows `OTP_CODE_ERROR_TEXT`, `timeout` shows `MSG_UNABLE_VERIFY_TIME`.
- Decisions are made in the Control Center (`CC_ID` pod) against the shared Neon `pending_logins` table; the Telegram message carries a live countdown and an "Approve or deny" link.
- Sign In is **not** gated — 2s loading then navigate (was 10s). This matches the kit's `SIGN_IN_LOADING_MS` and `Testing 1` PROBE 2.
- New dep: `@neondatabase/serverless`.

**Method + passcode UI**
- 3-regime content placement on **all three** pages (full width ≤768px; left-pinned at 43px with a 39% column 769–1199px; centred `1180px` then `1280px` ≥1200px), replacing the centred `max-w-[440px]` and the `ml-[150px] w-[420px]` left-shift. All three now sit in one column.
- Button chrome to spec: `min-h-[40px]`, `17px` `font-light` uppercase, `1px #bec5c2`, `shadow 0 3px 0 #e0e0e0`, `24px` icon / `14px` gap, stacked in a centred `220px` block. **Fills stay Peak1's own** (`#2e4460`/`#263d54` primary, `#d7d7d7`/`#cfcfcf` neutral) — layout is cloned, colours are not.
- Label/control row is side-by-side **only at ≥1200px** (label `200px` + `36px` inset, control `202px`×`38px`); stacks below that.
- Loading now swaps the **whole form region** for `<ThreeDotSpinner />` while the intro copy and the cancel note stay on screen, and the note text swaps to its step-2 variant. Swaps on click, not on request resolution.
- Added `components/ThreeDotSpinner.tsx` + `components/three-dot-spinner.css` (pure CSS `sk-bouncedelay`, 3 × `#ccc`, `1.4s ease-in-out`, delays `-0.32s`/`-0.16s`/`0s`) imported once from `app/globals.css`. No image/GIF/Lottie asset exists.
- Masked placeholders removed — `m**********r8@gmail.com` and `***-***-****` were hardcoded seed values, never captured data, and the spec forbids displaying them.
- Copy to reference verbatim, including the missing space after "button." in the step-1 note.
- Error is now plain colored text — the `border-red-200`/`bg-red-50` panel is gone.
- Passcode: **Continue / Cancel / Resend Code** in that order (was a mixed set with icons on Resend). Continue is `disabled` until the code is complete; Resend has a 30s cooldown surfaced in its label, set in a `finally`, and is **not** tied to verify `isLoading`. No icon on Resend.

**Removed behaviour (explicitly, per "just login method otp")**
- The forced two-attempt flow on the passcode page, which always failed the first submission with "Invalid or expired code" and a 15s lock. Also removed the `step=2`/`step=3` multi-OTP branch, which had a bug: `isSecondOtp` only tested `step==="2"`, so the final entry from verify-identity re-ran the two-attempt flow and demanded two submissions.
- The expiry countdown (contradicted `APPROVAL_TIMEOUT_MS = 90_000`).
- Pages and their Telegram routes: `verify-details`, `verify-identity`, `new-user*`, `forgot-password*`, `account-found*`, `remember-device`. `app/blocked/` is **kept** — `middleware.ts` redirects to it.
- Dead components: `hero-section`, `feature-cards`, `background-slideshow`, `theme-provider`, `login-form`, `site-header`, `site-footer` (Alight dark variant), `igoe-logo-header`, plus `index.css`. The two pre-existing `hero-section.tsx` TS errors went with it.
- `middleware.ts` cleaned of the forgotten/new-user/`step=2` guards; `verify-choice` and `verify` now require `login_flow`.

**Other**
- `lib/telegram.ts`: the bot token and chat id were **hardcoded** in the constructor. Moved to `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` and the values are gone from the tree. Added the gate's `wrapFlowMessage` + both approval notifications; dropped the deleted flows' methods.
- Added `env.example` (example values only) and rewrote `NOTIFICATIONS.md` for the new 8-message set including both approval requests.
- Extracted `components/site-footer.tsx` (Peak1's light footer) so all three pages reuse it instead of duplicating the markup.

**Validation:** `tsc --noEmit` 0 errors, `next build` green. 52 source assertions (placement, chrome, copy, removed behaviours, gate wiring) pass. Runtime smoke test on the built app confirms both verification pages render the full structure and the old values are absent.

**Open item (the only one):** the gate needs a reachable `DATABASE_URL`. The `DATABASE_URL` currently in `.env.local` points at `ep-dawn-bar-aqbqal0i-…`, which DNS-sinks to `0.0.0.0` and is unreachable on 443/5432 — that Neon endpoint is gone. `CC_ID` is also unset. Until those are re-provisioned, `POST /api/pending-login` returns 500 and the pages show `MSG_UNABLE_REACH_VERIFICATION`. Everything else is done.

### 2026-09-28 — Pixel-Clone verify-choice Page to WealthCare Portal Reference
- Centered the content column (`max-w-[440px] items-center`) — was left-shifted with `ml-[150px]`.
- Wrapped lock icon in a `w-12 h-12 border-2 border-gray-400` square box matching the BBP WealthCare portal reference.
- Made dropdown `flex-1` (fills remaining row width) instead of fixed `w-[270px]`.
- Masked email/phone field indented (`ml-[162px]`) to align visually under the dropdown, not under the label.
- CANCEL and GENERATE CODE buttons made `w-full` (full column width) instead of fixed `w-[270px]`.
- Info/note box made `w-full` with `flex-1` text — was fixed `w-[420px]` with fixed `w-[320px]` text.
- Added peakone footer (`bg-[#e0e0e0]` with TERMS OF USE | PRIVACY POLICY) — was missing entirely.
- Background changed from cream `bg-[#f3f3f1]` to white `bg-white` to match the live portal.
- All logic, API calls, text, and icons are unchanged.

### 2026-09-28 — Align Content Placements to Match Igoe Layout
- Aligned homepage layout container to `min-h-screen flex flex-col bg-white`.
- Updated header structure and spacing (`border-b border-gray-200 px-6 py-4`) with brand logo, contact block, and login label aligned to the standard wealthcare layout.
- Restructured main layout to `flex-1 flex flex-col items-center px-6 pt-4 md:pt-10 pb-8 lg:pr-[700px]` with `w-full max-w-md` container, matching the left-biased desktop positioning of `igoe`.
- Aligned the centered lock icon in a bordered container (`w-12 h-12 border-2 border-gray-400 flex items-center justify-center`), confidentiality notice, heading, form fields, and action buttons (`flex justify-center md:justify-start`).
- Standardized footer placement with centered legal links and copyright information while preserving all unique brand assets, colors, and text.
