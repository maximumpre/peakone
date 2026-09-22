"use client";

export function VerificationHeader() {
  return (
    <>
      <style>{`
        .topnav {
          background: #fff;
          border-bottom: 1px solid #ddd;
          padding: 8px 18px;
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .peakone-logo {
          height: 44px;
          width: auto;
          display: block;
          flex-shrink: 0;
        }
        .contact-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.8rem;
          color: #444;
        }
        .contact-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .contact-row svg {
          flex-shrink: 0;
          color: #555;
        }
        @media (max-width: 700px) {
          .topnav {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>
      <nav className="topnav">
        <a href="/" onClick={(e) => e.preventDefault()}>
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
      </nav>
    </>
  );
}
