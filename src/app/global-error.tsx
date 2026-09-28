"use client";

import { useEffect } from "react";

// This replaces the root layout entirely when an error escapes every
// nested boundary, so it must render its own <html>/<body> — Next.js
// requires this exact shape for global-error.tsx.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif", background: "#F9FAFB" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#0D1117" }}>Something went wrong</p>
          <p style={{ fontSize: 13, color: "#4B5565", maxWidth: 360 }}>
            The application hit an unexpected error. Try reloading the page.
          </p>
          <button
            onClick={reset}
            style={{
              border: "1px solid #E4E7EC",
              background: "#FFFFFF",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
