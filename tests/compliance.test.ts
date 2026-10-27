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
