/**
 * Business details shown on the public legal pages. Set these in the environment so the pages
 * carry the real legal entity; unset values render as an obvious [bracketed] placeholder instead
 * of silently publishing something wrong.
 */
export const legal = {
  company: process.env.LEGAL_COMPANY_NAME || "Zoraak Technologies",
  supportEmail: process.env.LEGAL_SUPPORT_EMAIL || "[support email — set LEGAL_SUPPORT_EMAIL]",
  privacyEmail: process.env.LEGAL_PRIVACY_EMAIL || process.env.LEGAL_SUPPORT_EMAIL || "[privacy email — set LEGAL_PRIVACY_EMAIL]",
  address: process.env.LEGAL_ADDRESS || "[registered business address — set LEGAL_ADDRESS]",
  jurisdiction: process.env.LEGAL_JURISDICTION || "[governing law / jurisdiction — set LEGAL_JURISDICTION]",
  lastUpdated: "27 October 2026",
};

/**
 * Postal address printed in the footer of every marketing email sent through the platform.
 * Returns undefined until a real address is configured, so a [placeholder] is never emailed.
 */
export function emailFooterAddress(): string | undefined {
  const address = process.env.LEGAL_ADDRESS?.trim();
  if (!address) return undefined;
  return `${legal.company}, ${address}`;
}
