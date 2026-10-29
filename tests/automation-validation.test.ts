import { describe, expect, it } from "vitest";
import { findAutomationIssue } from "@/lib/automation-validation";

const ok = new Set(["t1"]);

describe("findAutomationIssue", () => {
  it("rejects an automation with no steps", () => {
    expect(findAutomationIssue([], ok)).toMatch(/at least one step/);
  });
  it("accepts a valid send-email step", () => {
    expect(findAutomationIssue([{ order: 0, type: "SEND_EMAIL", config: { templateId: "t1" } }], ok)).toBeNull();
  });
  it("flags an empty send-email step and names its position", () => {
    const issue = findAutomationIssue(
      [{ order: 0, type: "SEND_EMAIL", config: { templateId: "t1" } }, { order: 1, type: "SEND_EMAIL", config: {} }],
      ok
    );
    expect(issue).toMatch(/Step 2/);
  });
  it("flags a template that no longer exists", () => {
    expect(findAutomationIssue([{ order: 0, type: "SEND_EMAIL", config: { templateId: "gone" } }], ok)).toMatch(/no longer exists/);
  });
  it("flags a zero wait and a blank tag", () => {
    expect(findAutomationIssue([{ order: 0, type: "WAIT", config: { minutes: 0 } }], ok)).toMatch(/Wait/);
    expect(findAutomationIssue([{ order: 0, type: "ADD_TAG", config: { tagName: "  " } }], ok)).toMatch(/tag name/);
  });
});
