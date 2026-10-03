import { createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export type SignatureResult = { ok: true } | { ok: false; reason: "MISSING_HEADERS" | "BAD_SECRET" | "STALE_TIMESTAMP" | "BAD_SIGNATURE" };

/**
 * Verifies a Svix-signed webhook (the scheme Resend uses): HMAC-SHA256 over
 * `${id}.${timestamp}.${rawBody}` keyed with the base64 part of `whsec_...`.
 * The timestamp window blocks replay of captured payloads; callers must also
 * dedupe on the message id.
 */
export function verifySvixSignature(input: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signatureHeader: string | null;
  rawBody: string;
  nowMs?: number;
}): SignatureResult {
  const { id, timestamp, signatureHeader } = input;
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: "MISSING_HEADERS" };

  const secretB64 = input.secret.startsWith("whsec_") ? input.secret.slice(6) : input.secret;
  const key = Buffer.from(secretB64, "base64");
  if (key.length === 0) return { ok: false, reason: "BAD_SECRET" };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "STALE_TIMESTAMP" };
  const nowSeconds = (input.nowMs ?? Date.now()) / 1000;
  if (Math.abs(nowSeconds - ts) > WEBHOOK_TOLERANCE_SECONDS) return { ok: false, reason: "STALE_TIMESTAMP" };

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${input.rawBody}`).digest();

  // Header holds one or more space-separated "v1,<base64>" entries (key rotation).
  for (const entry of signatureHeader.split(" ")) {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) continue;
    const provided = Buffer.from(signature, "base64");
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) return { ok: true };
  }
  return { ok: false, reason: "BAD_SIGNATURE" };
}
