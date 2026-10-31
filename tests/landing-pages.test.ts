import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ db: {} }));

import { landingPublicUrl, landingSettingsSchema, newLandingPublicId, renderLandingHtml, signupFrameHeight, starterBlocks, webBlocks } from "@/lib/landing-pages";
import { createDefaultBlock } from "@/lib/email-blocks";

describe("landing pages", () => {
  it("creates unguessable url-safe public ids", () => {
    const a = newLandingPublicId();
    expect(a).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(newLandingPublicId()).not.toBe(a);
    expect(landingPublicUrl(a)).toContain(`/p/${a}`);
  });

  it("starts with a hero that scrolls to the signup form", () => {
    const blocks = starterBlocks("Zoraak");
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    const hero = blocks[0];
    expect(hero.type).toBe("hero");
    if (hero.type === "hero") {
      expect(hero.headline).toContain("Zoraak");
      expect(hero.buttonUrl).toBe("#signup");
    }
  });

  it("drops footer blocks (they carry an email unsubscribe link)", () => {
    const blocks = [createDefaultBlock("hero"), createDefaultBlock("footer")];
    expect(webBlocks(blocks).map((b) => b.type)).toEqual(["hero"]);
  });

  it("renders a web page with title, description, form and no unsubscribe link", () => {
    const html = renderLandingHtml({
      blocks: [...starterBlocks("Zoraak"), createDefaultBlock("footer")],
      theme: null,
      title: "Spring <sale>",
      description: "Save big",
      form: { publicId: "abcDEF123456", collectName: true },
      businessName: "Zoraak",
    });
    expect(html).toContain("<title>Spring &lt;sale&gt;</title>");
    expect(html).toContain('name="description" content="Save big"');
    expect(html).toContain("/f/abcDEF123456?embed=1");
    expect(html).toContain('id="signup"');
    expect(html.toLowerCase()).not.toContain("unsubscribe");
    expect(html).not.toContain("{{");
  });

  it("credits signups to the page by passing its id to the form", () => {
    const html = renderLandingHtml({ blocks: starterBlocks("X"), theme: null, title: "T", form: { publicId: "abcDEF123456", collectName: false }, pageId: "PAGEid123456", businessName: "X" });
    expect(html).toContain("/f/abcDEF123456?embed=1&amp;ref=PAGEid123456");
  });

  it("omits the form area when no form is attached", () => {
    const html = renderLandingHtml({ blocks: starterBlocks("X"), theme: null, title: "T", form: null, businessName: "X" });
    expect(html).not.toContain("<iframe");
  });

  it("sizes the form frame by whether a name is collected", () => {
    expect(signupFrameHeight(true)).toBeGreaterThan(signupFrameHeight(false));
  });

  it("validates settings", () => {
    const ok = landingSettingsSchema.safeParse({ name: "Sale", seoTitle: "", seoDescription: "", formId: null });
    expect(ok.success).toBe(true);
    expect(landingSettingsSchema.safeParse({ name: "S", formId: null }).success).toBe(false);
    expect(landingSettingsSchema.safeParse({ name: "Sale", seoTitle: "x".repeat(71), formId: null }).success).toBe(false);
    expect(landingSettingsSchema.safeParse({ name: "Sale", formId: "not-a-uuid" }).success).toBe(false);
  });
});
