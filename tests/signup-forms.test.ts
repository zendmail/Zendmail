import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/lib/automation-engine", () => ({ triggerAutomations: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendSignupConfirmationEmail: vi.fn() }));

import { embedSnippet, hashToken, newPublicId, publicSignupSchema, signupFormSchema, defaultConsentText } from "@/lib/signup-forms";

const valid = {
  name: "Newsletter",
  title: "Join us",
  description: "",
  buttonLabel: "Subscribe",
  successMessage: "",
  collectName: true,
  consentText: defaultConsentText("Acme"),
  doubleOptIn: true,
  accentColor: "#0B5FFF",
};

describe("signup forms", () => {
  it("accepts a valid form and rejects bad colours or empty consent wording", () => {
    expect(signupFormSchema.safeParse(valid).success).toBe(true);
    expect(signupFormSchema.safeParse({ ...valid, accentColor: "red" }).success).toBe(false);
    expect(signupFormSchema.safeParse({ ...valid, consentText: "ok" }).success).toBe(false);
  });

  it("normalises the public email and rejects junk", () => {
    expect(publicSignupSchema.parse({ email: "  Jane@Example.COM " }).email).toBe("jane@example.com");
    expect(publicSignupSchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("makes unguessable public ids and stable token hashes", () => {
    const a = newPublicId();
    expect(a).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(newPublicId()).not.toBe(a);
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds an iframe embed that points at the hosted page in embed mode", () => {
    const html = embedSnippet("abcDEF123456");
    expect(html).toContain("/f/abcDEF123456?embed=1");
    expect(html.startsWith("<iframe")).toBe(true);
  });
});
