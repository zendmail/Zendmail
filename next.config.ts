import type { NextConfig } from "next";

const baseHeaders = [
  // Force HTTPS on every subsequent visit, including subdomains, for a
  // full year, and opt into the browser preload list.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Stop browsers guessing content types for served files.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the full referrer URL (which can contain tokens in query
  // strings) to third-party origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features this app never uses.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const csp = (frameAncestors: string) => ({
  key: "Content-Security-Policy",
  value: [
      "default-src 'self'",
      // 'unsafe-inline' is required for Next's inline hydration script and the
      // email-preview iframes' srcDoc content; tighten with a nonce if you
      // later add a CSP-reporting endpoint to monitor real violations.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.anthropic.com https://api.stripe.com",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      `frame-ancestors ${frameAncestors}`,
    ].join("; "),
});

// The app itself is never framed (clickjacking). Public signup forms (/f/...) are the one exception: customers embed
// them in their own sites with an iframe. They contain no session or account data.
const securityHeaders = [{ key: "X-Frame-Options", value: "DENY" }, ...baseHeaders, csp("'none'")];
const embeddableHeaders = [...baseHeaders, csp("*")];

const nextConfig: NextConfig = {
  

  async headers() {
    return [
      { source: "/f/:path*", headers: embeddableHeaders },
      // Everything except /f/... gets the strict headers, so no route ever receives two conflicting sets.
      { source: "/((?!f/).*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
