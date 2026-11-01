import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { socialIconStyle, withExplicitSocialStyle } from "@/lib/email-builder/social-style";
import { renderEmailHtml } from "@/lib/email-builder/render";
import type { EmailBlock } from "@/db/schema";

const social = (extra: Record<string, unknown> = {}) =>
  ({ id: "s1", type: "social", links: [{ network: "instagram", url: "https://instagram.com" }], bg: "@surface", ...extra }) as unknown as EmailBlock;

describe("social icon style", () => {
  it("uses brand colours by default and for the old theme-colour default", () => {
    expect(socialIconStyle({})).toBe("brand");
    expect(socialIconStyle({ iconBg: "@primary" })).toBe("brand");
  });

  it("keeps a deliberately chosen colour or style", () => {
    expect(socialIconStyle({ iconBg: "#112233" })).toBe("color");
    expect(socialIconStyle({ iconStyle: "color" })).toBe("color");
    expect(socialIconStyle({ iconStyle: "brand", iconBg: "#112233" })).toBe("brand");
  });

  it("makes the style explicit for the editor", () => {
    const [legacy] = withExplicitSocialStyle([social({ iconBg: "@primary" })]);
    expect(legacy).toMatchObject({ iconStyle: "brand" });
    expect(legacy).not.toHaveProperty("iconBg");
    const [custom] = withExplicitSocialStyle([social({ iconBg: "#112233" })]);
    expect(custom).toMatchObject({ iconStyle: "color", iconBg: "#112233" });
  });

  it("renders brand icons for legacy blocks", () => {
    expect(renderEmailHtml([social({ iconBg: "@primary" })])).toContain("brand=1");
    expect(renderEmailHtml([social({ iconStyle: "color", iconBg: "#112233" })])).not.toContain("brand=1");
  });
});
