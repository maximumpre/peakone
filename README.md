# Peak1 Administration Member Portal

Peak1 Administration member portal login and verification experience.

## Changelog

### 2026-09-29 — Remove the initial loading screen
The splash/preloader that blocked the homepage before the login form is gone. The landing renders immediately.

- Deleted `components/preloader.tsx` (the fixed-overlay that showed `loading_animation.gif` + "Hold on" for 1.5s, then a further 300ms fade before calling back) and its orphaned `public/loading_animation.gif`.
- `app/page.tsx` no longer gates the page behind `showContent`. The `Preloader` import, the `showContent` state and the `{!showContent && …}{showContent && (…)` wrapper are removed — the page body is now returned directly, and the block is re-indented to match.
- Verified in SSR that the landing returns the complete login form immediately (`Sign in`, the `login-form`, UserId/Password fields, `SIGN IN` and the footer all present, 20KB of HTML, zero preloader markup) rather than a spinner shell.

This also removes a real delay: the old preloader held the page for ~1.8s regardless of whether anything was actually loading.

**Validation:** `tsc --noEmit` 0 errors, `next build` green, no `Preloader`/`showContent`/`loading_animation` references left in `app/`, `components/` or `lib/`.

### 2026-09-29 — Fix button chrome: rounded corners, missing border, and inconsistent styles
You spotted that the button border as declared in the kit wasn't applied here. It was worse than that — three separate problems, now fixed and made consistent across the whole flow.

**What was wrong**
- **Buttons rendered rounded.** Sleipnir declares `border border-[#bec5c2] rounded-none`, but the `rounded-none` half was never applied. shadcn's `Button` base carries `rounded-md`, so it won and every gate button came out with rounded corners. The `#bec5c2` border was there — it was just wrapping a rounded rectangle instead of a square one.
- **The shadow was wrong.** Buttons carried `shadow-[0_3px_0_#e0e0e0]`, a grey bottom edge. The correct Plansource treatment is a symmetric **3px brand-coloured glow**: `box-shadow: 0 0 3px 0 #2e4460`. (Sleipnir had been changed to the grey edge by mistake and is being reverted separately — see below.)
- **The landing didn't use the chrome at all.** `.btn-signin` and `.btn-register` had `border:none`, `border-radius:3px` and no shadow, at `14px`/`600` with no uppercase — so the landing and the verification steps read as different design systems.

**Fixes**
- Added `lib/wealthcare-button-styles.ts` — the shared Wealthcare token module the kit tells every project to copy (`border border-[#bec5c2] rounded-none`, `shadow-[0_0_3px_0_#2e4460]` primary, `shadow-[0_0_3px_0_#bec5c2]` neutral, plus `WEALTHCARE_BUTTON_GEOMETRY` and `WEALTHCARE_BUTTON_STACK`). Peak1 fills are exported too (`#2e4460`/`#263d54`, `#d7d7d7`/`#cfcfcf`).
- Replaced the per-page inline `BUTTON_CHROME` strings in `verify-choice` and `verify` with those tokens, so both pages and any future page share one declaration and can't drift again. Fills now come from the `PEAKONE_*` constants instead of scattered hex literals.
- Landing `.btn-signin` / `.btn-register` moved to the full kit chrome: `1px #bec5c2` border, `border-radius:0`, `box-shadow:0 0 3px 0 #2e4460`, `17px`, `font-weight:300`, `text-transform:uppercase`, `min-height:40px`. **Fills stay Peak1's own** (`#9a8650` and `#5a6378`) and the buttons keep their inline arrangement. Per the reference, both buttons share ONE glow hue even though their fills differ — the glow is the site's brand colour, not each button's own.
- Verified in the built output that `rounded-none` now beats `rounded-md`: all 5 flow buttons report `rounded-none` present and `rounded-md` absent, with the correct border and glow.

**Register button**
- Now navigates to `/api/login-out` (the post-approval Peak1 handshake) with a 1s loading state, instead of the dead-end "Opening registration…" toast. The orphaned toast CSS and markup are removed.

**Evidence for the shadow correction** — captured reference CSS in `Alex/Alex New/Melody-wealthcare-portal/app/globals.css:187` reads `border: 1px solid #bec5c2; border-radius: 0; box-shadow: 0 0 3px 0 #8b54a2;`. A survey of all 28 `wealthcare-button-styles.ts` files across `TAF/` found 27 using the glow and only Sleipnir's (a mistaken edit) using the grey bottom edge; `border border-[#bec5c2] rounded-none` is declared by 28/28.

**Validation:** `tsc --noEmit` 0 errors, `next build` green, 17 chrome assertions pass.

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
