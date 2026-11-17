import { describe, expect, it } from "vitest";
import { renderEmailHtml, renderEmailText } from "@/lib/email-builder/render";
import { sanitizeBlocks } from "@/lib/email-builder/document";
import { editorReducer, initEditorState } from "@/lib/email-builder/editor-state";
import { createDefaultBlock } from "@/lib/email-blocks";
import type { EmailBlock } from "@/db/schema";

const canvas = (extra: Record<string, unknown> = {}) =>
  ({ id: "c1", type: "canvas", height: 300, bg: "@surface", items: [
    { kind: "text", text: "Hello", x: 10, y: 20, w: 200, h: 40, fontSize: 30, weight: "bold", color: "@text" },
    { kind: "button", text: "Shop", url: "https://example.com/shop", x: 10, y: 100, w: 120, h: 44, bg: "@primary" },
    { kind: "bogus", x: 0, y: 0, w: 1, h: 1 },
  ], ...extra }) as unknown as EmailBlock;

describe("Free layout block", () => {
  it("keeps valid elements, drops invalid ones and clamps numbers", () => {
    const [b] = sanitizeBlocks([canvas({ height: 99999 })]) as Extract<EmailBlock, { type: "canvas" }>[];
    expect(b.height).toBe(1600);
    expect(b.items.map((i) => i.kind)).toEqual(["text", "button"]);
    expect(b.items[0]).toMatchObject({ x: 10, y: 20, fontSize: 30, weight: "bold" });
  });

  it("sends the rendered picture in emails and the live layout on web pages", () => {
    const withPic = canvas({ rendered: "https://example.com/pic.png", link: "https://example.com/all" });
    const email = renderEmailHtml([withPic]);
    expect(email).toContain('src="https://example.com/pic.png"');
    expect(email).toContain('href="https://example.com/all"');
    expect(email).not.toContain("position:absolute");
    const page = renderEmailHtml([withPic], { page: { title: "T" } });
    expect(page).toContain("position:absolute");
    expect(page).toContain("data-zm-designer");
    expect(page).toContain("Hello");
  });

  it("falls back to stacked content in emails when no picture exists yet", () => {
    const email = renderEmailHtml([canvas()]);
    expect(email).toContain("Hello");
    expect(email).toContain("Shop");
    expect(email).not.toContain("position:absolute");
  });

  it("adds readable text to the plain-text version and replaces a block in one undo step", () => {
    expect(renderEmailText([canvas()])).toContain("Shop: https://example.com/shop");
    const base = createDefaultBlock("canvas");
    const state = initEditorState({ theme: {} as never, blocks: [base] } as never);
    const next = editorReducer(state, { type: "REPLACE", id: base.id, block: { ...(base as object), height: 500 } as EmailBlock });
    expect((next.doc.blocks[0] as { height: number }).height).toBe(500);
    expect(next.past.length).toBe(1);
  });
});
