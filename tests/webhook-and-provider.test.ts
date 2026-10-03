import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySvixSignature } from "@/lib/sending/webhook-signature";
import { mapResendRecords } from "@/lib/email-provider";

const secretBytes = Buffer.from("super-secret-key-bytes-1234567890");
const secret = `whsec_${secretBytes.toString("base64")}`;
const now = 1_700_000_000_000;

function sign(id: string, ts: string, body: string, key = secretBytes) {
  return `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
}
const ts = String(now / 1000);
const body = JSON.stringify({ type: "email.bounced", data: { email_id: "e1" } });

describe("webhook signature verification", () => {
  it("accepts a valid signature", () => {
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signatureHeader: sign("msg_1", ts, body), rawBody: body, nowMs: now })).toEqual({ ok: true });
  });
  it("accepts when any of several rotated signatures matches", () => {
    const header = `v1,AAAA ${sign("msg_1", ts, body)}`;
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signatureHeader: header, rawBody: body, nowMs: now }).ok).toBe(true);
  });
  it("rejects a tampered body", () => {
    const r = verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signatureHeader: sign("msg_1", ts, body), rawBody: body + " ", nowMs: now });
    expect(r).toEqual({ ok: false, reason: "BAD_SIGNATURE" });
  });
  it("rejects a signature made with a different secret", () => {
    const wrong = sign("msg_1", ts, body, Buffer.from("another-secret"));
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signatureHeader: wrong, rawBody: body, nowMs: now }).ok).toBe(false);
  });
  it("rejects missing headers", () => {
    expect(verifySvixSignature({ secret, id: null, timestamp: ts, signatureHeader: null, rawBody: body, nowMs: now })).toEqual({ ok: false, reason: "MISSING_HEADERS" });
  });
  it("rejects replayed (stale) and future-dated payloads", () => {
    const old = String(now / 1000 - 10 * 60);
    expect(verifySvixSignature({ secret, id: "m", timestamp: old, signatureHeader: sign("m", old, body), rawBody: body, nowMs: now })).toEqual({ ok: false, reason: "STALE_TIMESTAMP" });
    const future = String(now / 1000 + 10 * 60);
    expect(verifySvixSignature({ secret, id: "m", timestamp: future, signatureHeader: sign("m", future, body), rawBody: body, nowMs: now }).ok).toBe(false);
  });
  it("rejects non-v1 or malformed entries", () => {
    expect(verifySvixSignature({ secret, id: "m", timestamp: ts, signatureHeader: "v2,abc garbage", rawBody: body, nowMs: now }).ok).toBe(false);
  });
});

describe("Resend adapter mapping", () => {
  it("maps provider records and statuses, skipping unrelated families", () => {
    const out = mapResendRecords([
      { record: "DKIM", name: "resend._domainkey", type: "TXT", value: "p=abc", status: "verified" },
      { record: "SPF", name: "send", type: "MX", value: "feedback-smtp.example.com", priority: 10, status: "pending" },
      { record: "SPF", name: "send", type: "TXT", value: "v=spf1 include:x ~all", status: "failed" },
      { record: "Receiving", name: "@", type: "MX", value: "inbound.example.com", status: "not_started" },
    ]);
    expect(out).toEqual([
      { type: "TXT", host: "resend._domainkey", value: "p=abc", purpose: "DKIM", status: "PASSING" },
      { type: "MX", host: "send", value: "feedback-smtp.example.com", priority: 10, purpose: "RETURN_PATH", status: "PENDING" },
      { type: "TXT", host: "send", value: "v=spf1 include:x ~all", purpose: "SPF", status: "FAILING" },
    ]);
  });
  it("unknown statuses are NOT_CHECKED, never passing", () => {
    expect(mapResendRecords([{ record: "DKIM", name: "k", type: "TXT", value: "v", status: "weird" }])[0].status).toBe("NOT_CHECKED");
  });
});
