import type { NextConfig } from "next";

const securityHeaders = [
  // Force HTTPS on every subsequent visit, including subdomains, for a
  // full year, and opt into the browser preload list.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Prevent this app from ever being framed — blocks clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers guessing content types for served files.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the full referrer URL (which can contain tokens in query
  // strings) to third-party origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features this app never uses.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' is required for Next's inline hydration script and the
      // email-preview iframes' srcDoc content; tighten with a nonce if you
      // later add a CSP-reporting endpoint to monitor real violations.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.anthropic.com https://api.stripe.com",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Standalone output produces a minimal, self-contained server bundle —
  // the right shape for a container/serverless deploy rather than needing
  // the full node_modules tree on the production host.
  output: "standalone",

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
