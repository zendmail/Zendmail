/**
 * Pure helpers (no server-only / DB imports) so they can be unit-tested and used anywhere.
 */

/** Free-mail and public providers: nobody can verify ownership of these, and sending "as" them would be spoofing. */
const BLOCKED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.co.uk", "ymail.com", "outlook.com",
  "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com", "aol.com", "proton.me",
  "protonmail.com", "zoho.com", "gmx.com", "mail.com", "yandex.com", "rediffmail.com",
  // The platform's own and the provider's shared domains.
  "zendmail.demo", "resend.dev",
  // Public suffixes people commonly paste by mistake.
  "co.uk", "com.au", "co.in",
]);

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type DomainParseResult = { ok: true; domain: string } | { ok: false; error: string };

/**
 * Accepts what people actually paste — "Brand.com", "https://www.brand.com/shop", "news@brand.com" —
 * and returns a clean lower-case hostname, or a friendly error.
 */
export function parseSendingDomain(input: string): DomainParseResult {
  let value = input.trim().toLowerCase();
  if (!value) return { ok: false, error: "Enter your domain, for example yourbrand.com." };

  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // protocol
  if (value.includes("@")) value = value.split("@").pop() ?? ""; // email address
  value = value.split(/[/?#]/)[0]; // path / query
  value = value.replace(/:\d+$/, ""); // port
  value = value.replace(/\.$/, ""); // trailing dot
  if (value.startsWith("www.")) value = value.slice(4);

  if (!value || value.length > 253) return { ok: false, error: "That doesn't look like a valid domain." };
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return { ok: false, error: "Use a domain name, not an IP address." };

  const labels = value.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l)) || !/^[a-z]{2,}$/.test(labels[labels.length - 1])) {
    return { ok: false, error: "That doesn't look like a valid domain. Use something like yourbrand.com." };
  }
  if (BLOCKED_DOMAINS.has(value)) {
    return {
      ok: false,
      error: "You can't verify a shared email provider's domain. Use a domain you own (for example yourbrand.com).",
    };
  }
  return { ok: true, domain: value };
}

export function domainOfEmail(email: string): string {
  return email.split("@").pop()?.trim().toLowerCase() ?? "";
}
