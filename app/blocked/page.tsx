"use client";

import { VerificationHeader } from "@/components/verification-header";

export default function BlockedPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#fff",
      }}
    >
      <VerificationHeader />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          backgroundColor: "#ffe6e6",
          fontFamily: "Arial, sans-serif",
          color: "#333",
          padding: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffcccc",
            border: "2px solid #ff0000",
            padding: "40px",
            borderRadius: "10px",
            boxShadow: "0 4px 22px rgba(255,0,0,.3)",
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          <h1 style={{ color: "#ff0000", marginBottom: "20px", fontSize: "2em" }}>
            🚫 Access Blocked
          </h1>
          <p style={{ fontSize: "18px", marginBottom: "20px", color: "#cc0000" }}>
            Your access has been blocked due to suspicious activity detected.
          </p>
          <p style={{ fontSize: "14px", color: "#990000" }}>
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
