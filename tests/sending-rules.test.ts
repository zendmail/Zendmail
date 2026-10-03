import { describe, expect, it } from "vitest";
import {
  computeRates,
  decideSender,
  isDomainSendable,
  normalizeDomain,
  normalizeEmail,
  parseDmarc,
  type SenderCandidateIdentity,
} from "@/lib/sending/rules";

const PASSING = { ownershipStatus: "PASSING", dkimStatus: "PASSING", spfStatus: "PASSING", returnPathStatus: "PASSING" } as const;

function identity(over: Partial<SenderCandidateIdentity> & { domainState?: Partial<typeof PASSING> | Record<string, string> } = {}): SenderCandidateIdentity {
  const { domainState, ...rest } = over;
  return {
    id: "i1",
    workspaceId: "ws-a",
    domainId: "d1",
    fromName: "Learn With Ahmed",
    fromEmail: "courses@learnwithahmed.com",
    replyTo: "support@learnwithahmed.com",
    domain: { id: "d1", workspaceId: "ws-a", domain: "learnwithahmed.com", ...PASSING, ...(domainState as object) },
    ...rest,
  } as SenderCandidateIdentity;
}

const base = { workspaceId: "ws-a", managedDomains: ["zendmail.demo"] };

describe("domain input", () => {
  it("normalizes urls and case", () => {
    expect(normalizeDomain("https://www.LearnWithAhmed.com/pricing")).toBe("learnwithahmed.com");
  });
  it("rejects junk and free-mail domains", () => {
    expect(normalizeDomain("not a domain")).toBeNull();
    expect(normalizeDomain("localhost")).toBeNull();
    expect(normalizeDomain("gmail.com")).toBeNull();
  });
  it("validates emails", () => {
    expect(normalizeEmail(" A@B.co ")).toBe("a@b.co");
    expect(normalizeEmail("nope")).toBeNull();
  });
});

describe("domain authentication status", () => {
  it("is sendable only when ownership, DKIM and SPF all pass", () => {
    expect(isDomainSendable(PASSING)).toBe(true);
    expect(isDomainSendable({ ...PASSING, dkimStatus: "PENDING" })).toBe(false);
    expect(isDomainSendable({ ...PASSING, spfStatus: "FAILING" })).toBe(false);
    expect(isDomainSendable({ ...PASSING, ownershipStatus: "NOT_CHECKED" })).toBe(false);
  });
  it("blocks on a failing/pending return-path but allows providers without one", () => {
    expect(isDomainSendable({ ...PASSING, returnPathStatus: "FAILING" })).toBe(false);
    expect(isDomainSendable({ ...PASSING, returnPathStatus: "PENDING" })).toBe(false);
    expect(isDomainSendable({ ...PASSING, returnPathStatus: "NOT_CHECKED" })).toBe(true);
  });
  it("never treats an unchecked domain as passing", () => {
    expect(isDomainSendable({ ownershipStatus: "NOT_CHECKED", dkimStatus: "NOT_CHECKED", spfStatus: "NOT_CHECKED", returnPathStatus: "NOT_CHECKED" })).toBe(false);
  });
});

describe("sender authorization", () => {
  it("verified domain can send", () => {
    const d = decideSender({ ...base, fromEmail: "Courses@LearnWithAhmed.com", identities: [identity()] });
    expect(d).toMatchObject({ ok: true, mode: "WORKSPACE_DOMAIN" });
  });
  it("unverified domain cannot send", () => {
    const d = decideSender({ ...base, fromEmail: "courses@learnwithahmed.com", identities: [identity({ domainState: { dkimStatus: "PENDING" } })] });
    expect(d).toMatchObject({ ok: false, code: "DOMAIN_NOT_VERIFIED" });
  });
  it("an address with no identity is refused, not silently rewritten", () => {
    const d = decideSender({ ...base, fromEmail: "ceo@somebrand.com", identities: [identity()] });
    expect(d).toMatchObject({ ok: false, code: "NO_IDENTITY" });
  });
  it("another workspace's identity can never be used", () => {
    const foreign = identity({ workspaceId: "ws-b", domain: { id: "d9", workspaceId: "ws-b", domain: "learnwithahmed.com", ...PASSING } });
    const d = decideSender({ ...base, fromEmail: "courses@learnwithahmed.com", identities: [foreign] });
    expect(d).toMatchObject({ ok: false, code: "NO_IDENTITY" });
  });
  it("rejects an identity whose domain row belongs to a different workspace", () => {
    const mismatched = identity({ domain: { id: "d1", workspaceId: "ws-b", domain: "learnwithahmed.com", ...PASSING } });
    expect(decideSender({ ...base, fromEmail: "courses@learnwithahmed.com", identities: [mismatched] })).toMatchObject({ ok: false });
  });
  it("managed domains send through the platform sender", () => {
    expect(decideSender({ ...base, fromEmail: "hello@acme.zendmail.demo", identities: [] })).toEqual({ ok: true, mode: "ZENDMAIL_MANAGED" });
  });
  it("lookalike of a managed domain is not managed", () => {
    expect(decideSender({ ...base, fromEmail: "hello@evilzendmail.demo", identities: [] })).toMatchObject({ ok: false });
  });
  it("invalid address is refused", () => {
    expect(decideSender({ ...base, fromEmail: "bad", identities: [] })).toMatchObject({ ok: false, code: "INVALID_ADDRESS" });
  });
});

describe("DMARC parsing", () => {
  it("finds the record and policy", () => {
    expect(parseDmarc(["v=spf1 -all", "v=DMARC1; p=reject; rua=mailto:a@b.co"])).toEqual({ found: true, policy: "reject" });
  });
  it("reports none and missing honestly", () => {
    expect(parseDmarc(["v=DMARC1; p=none"])).toEqual({ found: true, policy: "none" });
    expect(parseDmarc(["v=spf1 -all"])).toEqual({ found: false, policy: null });
    expect(parseDmarc([])).toEqual({ found: false, policy: null });
  });
});

describe("health rates", () => {
  it("refuses to compute rates from too little data", () => {
    expect(computeRates({ sent: 40, delivered: 0, bounced: 4, complained: 0, unsubscribed: 0 })).toEqual({ sufficient: false, sent: 40 });
  });
  it("computes rates from real counts, delivery rate null without delivery events", () => {
    const r = computeRates({ sent: 1000, delivered: 0, bounced: 20, complained: 1, unsubscribed: 5 });
    expect(r).toMatchObject({ sufficient: true, bounceRate: 0.02, complaintRate: 0.001, unsubscribeRate: 0.005, deliveryRate: null });
  });
});
