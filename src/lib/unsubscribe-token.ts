import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed unsubscribe tokens for emails that have no campaign_recipients row (automation emails).
 * Format: c.<contactId>.<hmac>. The key must stay stable, otherwise links already sent stop working,
 * so it falls back to the credentials encryption key rather than rotating secrets such as CRON_SECRET.
 */
function key() {
  return process.env.UNSUBSCRIBE_SECRET || process.env.STORE_CREDENTIALS_ENCRYPTION_KEY || "";
}

function sign(contactId: string) {
  return createHmac("sha256", key()).update(`unsubscribe:${contactId}`).digest("base64url");
}

export function contactUnsubscribeToken(contactId: string) {
  return `c.${contactId}.${sign(contactId)}`;
}

/** Returns the contact id when the token is a valid contact token, otherwise null. */
export function parseContactUnsubscribeToken(token: string): string | null {
  if (!key()) return null;
  const match = /^c\.([0-9a-f-]{36})\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!match) return null;
  const supplied = Buffer.from(match[2]);
  const expected = Buffer.from(sign(match[1]));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  return match[1];
}
