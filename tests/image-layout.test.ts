import { describe, expect, it } from "vitest";
import { renderEmailHtml } from "@/lib/email-builder/render";
import { sanitizeBlocks } from "@/lib/email-builder/document";
import { setBlockField } from "@/lib/email-builder/catalog";
import type { EmailBlock } from "@/db/schema";

const img = (extra: Record<string, unknown> = {}) => ({ id: "b1", type: "image", url: "https://example.com/a.png", alt: "A", ...extra });

describe("image layout controls", () => {
  it("keeps legacy images full-bleed", () => {
    const html = renderEmailHtml([img() as EmailBlock]);
    expect(html).toContain("max-width:600px");
    expect(html).not.toContain("margin:0 0 0 auto");
  });

  it("sanitises and clamps width / align / radius", () => {
    const [b] = sanitizeBlocks([img({ imageWidth: 500, imageAlign: "bogus", imageRadius: 12 })]) as Extract<EmailBlock, { type: "image" }>[];
    expect(b.imageWidth).toBe(100);
    expect(b.imageAlign).toBeUndefined();
    expect(b.imageRadius).toBe(12);
  });

  it("renders a smaller right-aligned image with radius", () => {
    const html = renderEmailHtml([img({ imageWidth: 50, imageAlign: "right", imageRadius: 16 }) as EmailBlock]);
    expect(html).toContain("max-width:300px");
    expect(html).toContain("margin:0 0 0 auto");
    expect(html).toContain("border-radius:16px");
  });

  it("applies hero image width and button options", () => {
    const hero = { id: "h", type: "hero", headline: "Hi", imageUrl: "https://example.com/a.png", imageWidth: 50, buttonLabel: "Go", buttonUrl: "https://example.com" } as EmailBlock;
    expect(renderEmailHtml([hero])).toContain("max-width:240px");
    const btn = { id: "x", type: "button", label: "Buy", url: "https://example.com", align: "right", size: "large", fullWidth: true } as EmailBlock;
    const html = renderEmailHtml([btn]);
    expect(html).toContain("font-size:17px");
    expect(html).toContain('width="100%"');
    const [kept] = sanitizeBlocks([btn]) as Extract<EmailBlock, { type: "button" }>[];
    expect(kept).toMatchObject({ align: "right", size: "large", fullWidth: true });
  });

  it("sets the new fields through the settings path", () => {
    const next = setBlockField(img() as EmailBlock, "imageWidth", "40");
    expect(next && "imageWidth" in next ? next.imageWidth : null).toBe(40);
  });
});

describe("free image position", () => {
  it("renders percentage offsets and a vertical lift", () => {
    const html = renderEmailHtml([img({ imageWidth: 50, imageX: 100, imageY: -20 }) as EmailBlock]);
    expect(html).toMatch(/margin:0 0 0 [\d.]+%;margin-top:-20px/);
  });
  it("sanitises x/y and moves both in one reducer step", async () => {
    const [b] = sanitizeBlocks([img({ imageX: 400, imageY: -999 })]) as Extract<EmailBlock, { type: "image" }>[];
    expect(b.imageX).toBe(100);
    expect(b.imageY).toBe(-120);
    const { editorReducer, initEditorState } = await import("@/lib/email-builder/editor-state");
    const state = initEditorState({ theme: {} as never, blocks: [img() as EmailBlock] } as never);
    const next = editorReducer(state, { type: "FIELD", id: "b1", path: "imagePos", value: "30,15" });
    expect(next.doc.blocks[0]).toMatchObject({ imageX: 30, imageY: 15 });
    expect(next.past.length).toBe(1);
  });
});
