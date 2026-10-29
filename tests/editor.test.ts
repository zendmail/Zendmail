import { describe, expect, it } from "vitest";
import { createDefaultBlock } from "@/lib/email-blocks";
import { DocumentError, sanitizeBlocks, sanitizeDocument, sanitizeRichText } from "@/lib/email-builder/document";
import { editorReducer, initEditorState, type EditorAction, type EditorState } from "@/lib/email-builder/editor-state";
import { CATALOG } from "@/lib/email-builder/catalog";
import { DEFAULT_THEME } from "@/lib/email-builder/theme";
import { TEMPLATE_LIBRARY } from "@/lib/template-library";

const TYPES = CATALOG.flatMap((g) => g.types);
const run = (s: EditorState, ...a: EditorAction[]) => a.reduce(editorReducer, s);
const base = () => initEditorState({ blocks: [createDefaultBlock("header"), createDefaultBlock("hero"), createDefaultBlock("footer")], theme: DEFAULT_THEME });

describe("sanitizeDocument", () => {
  it("round-trips every default block unchanged", () => {
    for (const type of TYPES) {
      const block = createDefaultBlock(type);
      expect(sanitizeBlocks([block])[0], type).toEqual(block);
    }
  });

  it("round-trips every built-in template without losing content", () => {
    for (const t of TEMPLATE_LIBRARY) {
      const clean = (v: unknown) => JSON.parse(JSON.stringify(v));
      expect(clean(sanitizeBlocks(t.blocks)), t.key).toEqual(clean(t.blocks));
    }
  });

  it("drops unknown types, unknown fields and unsafe urls", () => {
    const out = sanitizeBlocks([
      { id: "a", type: "evil", x: 1 },
      { id: "b", type: "button", label: "Go", url: "javascript:alert(1)", onclick: "x" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ id: "b", type: "button", label: "Go", url: "" });
  });

  it("makes ids unique and valid", () => {
    const out = sanitizeBlocks([{ id: "x", type: "divider" }, { id: "x", type: "divider" }, { id: "bad id!", type: "divider" }]);
    expect(new Set(out.map((b) => b.id)).size).toBe(3);
    expect(out.every((b) => /^[A-Za-z0-9_-]{1,64}$/.test(b.id))).toBe(true);
  });

  it("enforces limits", () => {
    expect(() => sanitizeDocument({ blocks: Array.from({ length: 81 }, () => ({ type: "divider" })) })).toThrow(DocumentError);
    expect(() => sanitizeDocument(null)).toThrow(DocumentError);
    expect(sanitizeDocument({ blocks: [], theme: { primary: "nope" } }).theme.primary).toBe(DEFAULT_THEME.primary);
  });

  it("strips scripts and event handlers from rich text", () => {
    const html = sanitizeRichText('<p onclick="x()">Hi <script>alert(1)</script><a href="javascript:x" style="a">bad</a> <a href="https://ok.com">ok</a> <b>b</b></p>');
    expect(html).not.toMatch(/onclick|<script|javascript:|style=/i);
    expect(html).toContain('<a href="https://ok.com" target="_blank">');
    expect(html).toContain("<b>b</b>");
  });
});

describe("editorReducer", () => {
  it("adds, selects and undoes", () => {
    const s0 = base();
    const s1 = run(s0, { type: "ADD", blockType: "cards", index: 1 });
    expect(s1.doc.blocks).toHaveLength(4);
    expect(s1.doc.blocks[1].type).toBe("cards");
    expect(s1.selectedId).toBe(s1.doc.blocks[1].id);
    const s2 = run(s1, { type: "UNDO" });
    expect(s2.doc.blocks).toHaveLength(3);
    expect(run(s2, { type: "REDO" }).doc.blocks).toHaveLength(4);
  });

  it("moves and duplicates and removes", () => {
    const s0 = base();
    const heroId = s0.doc.blocks[1].id;
    const moved = run(s0, { type: "MOVE", id: heroId, toIndex: 0 });
    expect(moved.doc.blocks[0].id).toBe(heroId);
    const dup = run(moved, { type: "DUPLICATE", id: heroId });
    expect(dup.doc.blocks[1].type).toBe("hero");
    expect(dup.doc.blocks[1].id).not.toBe(heroId);
    const removed = run(dup, { type: "REMOVE", id: dup.doc.blocks[1].id });
    expect(removed.doc.blocks).toHaveLength(3);
  });

  it("coalesces typing into one undo step", () => {
    const s0 = base();
    const id = s0.doc.blocks[1].id;
    const typed = run(s0,
      { type: "FIELD", id, path: "headline", value: "H" },
      { type: "FIELD", id, path: "headline", value: "He" },
      { type: "FIELD", id, path: "headline", value: "Hel" });
    expect(typed.past).toHaveLength(1);
    expect(run(typed, { type: "UNDO" }).doc).toEqual(s0.doc);
  });

  it("rejects invalid values and leaves state untouched", () => {
    const s0 = base();
    const id = s0.doc.blocks[1].id;
    expect(run(s0, { type: "FIELD", id, path: "buttonUrl", value: "javascript:alert(1)" })).toBe(s0);
    expect(run(s0, { type: "FIELD", id: "nope", path: "headline", value: "x" })).toBe(s0);
    expect(run(s0, { type: "REMOVE", id: "nope" })).toBe(s0);
  });

  it("clears redo after a new edit and respects the block cap", () => {
    const s0 = base();
    const s1 = run(s0, { type: "ADD", blockType: "divider" }, { type: "UNDO" }, { type: "ADD", blockType: "spacer" });
    expect(s1.future).toHaveLength(0);
    let s = initEditorState({ blocks: Array.from({ length: 80 }, () => createDefaultBlock("divider")), theme: DEFAULT_THEME });
    s = run(s, { type: "ADD", blockType: "divider" });
    expect(s.doc.blocks).toHaveLength(80);
  });

  it("edits list items and theme", () => {
    const s0 = base();
    const hdr = s0.doc.blocks[0];
    const s1 = run(s0, { type: "ITEM_OP", id: hdr.id, listKey: "links", op: "add", index: 0 });
    expect((s1.doc.blocks[0] as { links: unknown[] }).links).toHaveLength(3);
    const s2 = run(s1, { type: "THEME", theme: { primary: "#112233" } });
    expect(s2.doc.theme.primary.toLowerCase()).toBe("#112233");
  });
});
