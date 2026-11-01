import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/lib/campaigns", () => ({ getCampaignById: vi.fn() }));

import { sniffImageType, uploadScopeSchema, storedImageUrl } from "@/lib/uploads";

const bytes = (...n: number[]) => new Uint8Array(n);

describe("image uploads", () => {
  it("identifies real images from their first bytes", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(sniffImageType(new TextEncoder().encode("GIF89a......"))).toBe("image/gif");
    expect(sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });

  it("rejects everything else, including SVG, HTML and scripts renamed to .png", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(sniffImageType(bytes())).toBeNull();
  });

  it("requires exactly one target", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(uploadScopeSchema.safeParse({ landingId: id }).success).toBe(true);
    expect(uploadScopeSchema.safeParse({}).success).toBe(false);
    expect(uploadScopeSchema.safeParse({ landingId: id, templateId: id }).success).toBe(false);
  });

  it("builds absolute public urls", () => {
    expect(storedImageUrl("abc")).toMatch(/^https?:\/\/.+\/api\/uploads\/images\/abc$/);
  });
});
