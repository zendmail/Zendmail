import { describe, expect, it } from "vitest";
import { evaluatePreSend, type PreSendInput } from "@/lib/sending/presend-rules";
import type { SenderCandidateIdentity } from "@/lib/sending/rules";

const identity: SenderCandidateIdentity = {
  id: "i1",
  workspaceId: "ws",
  domainId: "d1",
  fromName: "A",
  fromEmail: "a@x.com",
  replyTo: null,
  domain: { id: "d1", workspaceId: "ws", domain: "x.com", ownershipStatus: "PASSING", dkimStatus: "PASSING", spfStatus: "PASSING", returnPathStatus: "PASSING" },
};

function input(over: Partial<PreSendInput> = {}): PreSendInput {
  return {
    sender: { ok: true, mode: "WORKSPACE_DOMAIN", identity },
    replyTo: null,
    dmarc: { status: "PASSING", policy: "reject" },
    audience: { sendableCount: 10, skippedNoConsent: 0, skippedSuppressed: 0, skippedPaused: 0, skippedFrequencyCap: 0 },
    health: { sufficient: false, sent: 0 },
    concurrentCampaigns: 0,
    memberMaySend: true,
    ...over,
  };
}
const find = (r: ReturnType<typeof evaluatePreSend>, key: string) => r.checks.find((c) => c.key === key)!;

describe("pre-send checks", () => {
  it("allows a fully authenticated send", () => {
    expect(evaluatePreSend(input()).canSend).toBe(true);
  });
  it("blocks when the sender is not authorized, with reason and resolution", () => {
    const r = evaluatePreSend(input({ sender: { ok: false, code: "NO_IDENTITY", reason: "nope", resolution: "verify it" } }));
    expect(r.canSend).toBe(false);
    expect(find(r, "identity")).toMatchObject({ status: "FAIL", detail: "nope", resolution: "verify it" });
    expect(find(r, "dkim").status).toBe("UNKNOWN");
  });
  it("blocks when DKIM or SPF is not passing", () => {
    const bad = { ...identity, domain: { ...identity.domain, dkimStatus: "PENDING" as const } };
    const r = evaluatePreSend(input({ sender: { ok: true, mode: "WORKSPACE_DOMAIN", identity: bad } }));
    expect(r.canSend).toBe(false);
    expect(find(r, "dkim").status).toBe("FAIL");
  });
  it("missing DMARC warns but never blocks", () => {
    const r = evaluatePreSend(input({ dmarc: { status: "FAILING", policy: null } }));
    expect(find(r, "dmarc").status).toBe("WARN");
    expect(r.canSend).toBe(true);
  });
  it("managed sender is allowed with a warning", () => {
    const r = evaluatePreSend(input({ sender: { ok: true, mode: "ZENDMAIL_MANAGED" } }));
    expect(r.canSend).toBe(true);
    expect(find(r, "identity").status).toBe("WARN");
    expect(find(r, "dkim").status).toBe("N/A");
  });
  it("blocks members without send permission", () => {
    expect(evaluatePreSend(input({ memberMaySend: false })).canSend).toBe(false);
  });
  it("blocks an invalid Reply-To", () => {
    expect(evaluatePreSend(input({ replyTo: "not-an-email" })).canSend).toBe(false);
  });
  it("blocks an empty sendable audience", () => {
    expect(evaluatePreSend(input({ audience: { sendableCount: 0, skippedNoConsent: 5, skippedSuppressed: 0, skippedPaused: 0, skippedFrequencyCap: 0 } })).canSend).toBe(false);
  });
  it("reports bounce/complaint risk as unknown, not zero, without enough data", () => {
    const r = evaluatePreSend(input());
    expect(find(r, "bounce_risk").status).toBe("UNKNOWN");
    expect(find(r, "bounce_risk").detail).toMatch(/not enough data/i);
  });
  it("blocks on dangerous bounce or complaint rates", () => {
    const h = { sufficient: true as const, sent: 1000, bounceRate: 0.06, complaintRate: 0.004, unsubscribeRate: 0, deliveryRate: null };
    const r = evaluatePreSend(input({ health: h }));
    expect(r.canSend).toBe(false);
    expect(r.blockers.map((b) => b.key).sort()).toEqual(["bounce_risk", "complaint_risk"]);
  });
  it("warns on elevated but sub-threshold rates", () => {
    const h = { sufficient: true as const, sent: 1000, bounceRate: 0.03, complaintRate: 0.0005, unsubscribeRate: 0, deliveryRate: null };
    const r = evaluatePreSend(input({ health: h }));
    expect(r.canSend).toBe(true);
    expect(find(r, "bounce_risk").status).toBe("WARN");
  });
  it("flags concurrent campaigns as a warning", () => {
    expect(find(evaluatePreSend(input({ concurrentCampaigns: 2 })), "collision").status).toBe("WARN");
  });
});
