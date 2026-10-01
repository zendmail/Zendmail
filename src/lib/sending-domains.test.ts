import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectSendabilityErrors, generateDnsRecords, normalizeDomain } from "./sending-domains";

describe("sending domains", () => {
  it("normalizes a domain and produces DNS guidance", () => {
    assert.equal(normalizeDomain(" LearnWithAhmed.com "), "learnwithahmed.com");

    const records = generateDnsRecords("learnwithahmed.com");
    assert.equal(records.some((record) => record.type === "TXT" && record.purpose === "SPF"), true);
    assert.equal(records.some((record) => record.type === "CNAME" && record.purpose === "DKIM"), true);
    assert.equal(records.some((record) => record.type === "TXT" && record.purpose === "DMARC"), true);
  });

  it("blocks sends from unverified domains", () => {
    const errors = collectSendabilityErrors({
      fromEmail: "hello@learnwithahmed.com",
      replyTo: "support@learnwithahmed.com",
      status: "PENDING",
      domainVerified: false,
      workspaceVerifiedDomain: false,
      customMailFromConfigured: false,
    });

    assert.equal(errors.some((message) => message.includes("not verified")), true);
  });

  it("allows sends from a verified workspace domain", () => {
    const errors = collectSendabilityErrors({
      fromEmail: "courses@learnwithahmed.com",
      replyTo: "support@learnwithahmed.com",
      status: "VERIFIED",
      domainVerified: true,
      workspaceVerifiedDomain: true,
      customMailFromConfigured: false,
    });

    assert.deepEqual(errors, []);
  });
});
