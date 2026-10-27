import { describe, expect, it } from "vitest";
import { renderEmailHtml, renderEmailText } from "@/lib/email-builder/render";

describe("email postal address", () => {
  const blocks = [{ id: "t", type: "text", html: "<p>Hello</p>" }] as never;
  it("is printed in html and text when provided", () => {
    const address = "Zoraak Technologies, Office 1, Dubai, UAE";
    expect(renderEmailHtml(blocks, { postalAddress: address })).toContain(address);
    expect(renderEmailText(blocks, { postalAddress: address })).toContain(address);
  });
  it("is omitted when not provided", () => {
    expect(renderEmailHtml(blocks, {})).not.toContain("Dubai");
  });
});

import { contactUnsubscribeToken, parseContactUnsubscribeToken } from "@/lib/unsubscribe-token";
import { evaluatePreSend } from "@/lib/sending/presend-rules";

describe("contact unsubscribe token", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  it("round-trips and rejects tampering", () => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
    const token = contactUnsubscribeToken(id);
    expect(parseContactUnsubscribeToken(token)).toBe(id);
    expect(parseContactUnsubscribeToken(token.slice(0, -2) + "xx")).toBeNull();
    expect(parseContactUnsubscribeToken(`c.${"2".repeat(8)}-2222-2222-2222-${"2".repeat(12)}.${token.split(".")[2]}`)).toBeNull();
    expect(parseContactUnsubscribeToken("not-a-token")).toBeNull();
  });
});

describe("postal address pre-send check", () => {
  it("blocks only when no address is available", () => {
    const base = {
      sender: { ok: true, mode: "ZENDMAIL_MANAGED" } as never,
      replyTo: null,
      dmarc: null,
      audience: { sendableCount: 1, skippedNoConsent: 0, skippedSuppressed: 0, skippedPaused: 0, skippedFrequencyCap: 0 },
      health: { sufficient: false, sent: 0 } as never,
      concurrentCampaigns: 0,
      memberMaySend: true,
    };
    const missing = evaluatePreSend({ ...base, hasPostalAddress: false });
    expect(missing.checks.find((c) => c.key === "postal_address")?.blocking).toBe(true);
    expect(missing.canSend).toBe(false);
    expect(evaluatePreSend({ ...base, hasPostalAddress: true }).checks.find((c) => c.key === "postal_address")?.status).toBe("PASS");
  });
});
