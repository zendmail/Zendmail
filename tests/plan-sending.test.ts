import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canUseCustomDomain, dailyAllowance, FREE_DAILY_SEND_LIMIT } from "@/lib/sending/plan-rules";
import { decideSender, type SenderCandidateIdentity } from "@/lib/sending/rules";
import { evaluatePreSend, type PreSendInput } from "@/lib/sending/presend-rules";

const PASS = { ownershipStatus: "PASSING", dkimStatus: "PASSING", spfStatus: "PASSING", returnPathStatus: "PASSING" } as const;
const identity: SenderCandidateIdentity = {
  id: "i", workspaceId: "ws", domainId: "d", fromName: "Zoraak", fromEmail: "hello@zoraak.com", replyTo: null,
  domain: { id: "d", workspaceId: "ws", domain: "zoraak.com", ...PASS },
};

describe("plan gating", () => {
  it("only paid plans may use their own domain", () => {
    expect(canUseCustomDomain("Free")).toBe(false);
    expect(canUseCustomDomain(null)).toBe(false);
    expect(canUseCustomDomain("Starter")).toBe(true);
  });

  it("Free has a rolling allowance, paid has none", () => {
    expect(dailyAllowance("Free", 10)).toEqual({ limit: FREE_DAILY_SEND_LIMIT, sentLast24h: 10, remaining: FREE_DAILY_SEND_LIMIT - 10 });
    expect(dailyAllowance("Free", 999).remaining).toBe(0);
    expect(dailyAllowance("Growth", 999).limit).toBeNull();
  });

  it("Free workspaces send from the shared sender even if they once verified a domain", () => {
    const d = decideSender({ workspaceId: "ws", fromEmail: "hello@zoraak.com", identities: [identity], managedDomains: ["zendmail.demo"], allowCustomDomains: false });
    expect(d).toEqual({ ok: true, mode: "ZENDMAIL_MANAGED" });
  });

  it("paid workspaces still use their verified identity", () => {
    const d = decideSender({ workspaceId: "ws", fromEmail: "hello@zoraak.com", identities: [identity], managedDomains: [], allowCustomDomains: true });
    expect(d.ok && d.mode).toBe("WORKSPACE_DOMAIN");
  });

  it("blocks a campaign larger than the remaining Free allowance", () => {
    const input: PreSendInput = {
      sender: { ok: true, mode: "ZENDMAIL_MANAGED" },
      replyTo: null,
      dmarc: null,
      audience: { sendableCount: 40, skippedNoConsent: 0, skippedSuppressed: 0, skippedPaused: 0, skippedFrequencyCap: 0 },
      health: { sufficient: false, sent: 0 },
      concurrentCampaigns: 0,
      memberMaySend: true,
      dailyLimit: { limit: 50, sentLast24h: 20 },
    };
    const r = evaluatePreSend(input);
    expect(r.canSend).toBe(false);
    expect(r.blockers.map((b) => b.key)).toContain("daily-limit");
    const ok = evaluatePreSend({ ...input, audience: { ...input.audience, sendableCount: 30 } });
    expect(ok.checks.find((c) => c.key === "daily-limit")?.status).toBe("PASS");
  });
});
