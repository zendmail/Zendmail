import { describe, expect, it } from "vitest";
import type { EmailBlock } from "@/db/schema";
import { renderEmailHtml, renderEmailText } from "@/lib/email-builder/render";
import { applyMergeTags, buildVars } from "@/lib/email-builder/merge";
import { DEFAULT_THEME, contrastOn, isValidColorValue, parseTheme, resolveColor } from "@/lib/email-builder/theme";
import { resolveImageUrl, art } from "@/lib/email-builder/assets";
import { SECTION_DEFS, applyItemOp, isSectionType, setSectionField } from "@/lib/email-builder/schema";
import { canUseTemplate } from "@/lib/template-access";
import { TEMPLATE_LIBRARY, FREE_TEMPLATE_COUNT, PRO_TEMPLATE_COUNT } from "@/lib/template-library";

const hero = (over: Record<string, unknown> = {}) =>
  ({ id: "h1", type: "hero", headline: "Hello [[world]]", text: "Body", buttonLabel: "Go", buttonUrl: "https://example.com/x?a=1&b=2", bg: "@primary", ...over }) as EmailBlock;

describe("theme", () => {
  it("resolves tokens, hex and falls back safely", () => {
    expect(resolveColor("@primary", DEFAULT_THEME, "#000000")).toBe(DEFAULT_THEME.primary);
    expect(resolveColor("#abc", DEFAULT_THEME, "#000000")).toBe("#AABBCC");
    expect(resolveColor("red; background:url(x)", DEFAULT_THEME, "#123456")).toBe("#123456");
    expect(resolveColor("@nope", DEFAULT_THEME, "#123456")).toBe("#123456");
    expect(isValidColorValue("@accentSoft")).toBe(true);
    expect(isValidColorValue("javascript:alert(1)")).toBe(false);
  });
  it("picks readable text colours", () => {
    expect(contrastOn("#0B1A3D")).toBe("#FFFFFF");
    expect(contrastOn("#FFFFFF")).toBe("#0B1220");
  });
  it("sanitises untrusted themes", () => {
    const t = parseTheme({ primary: "not-a-colour", headingFont: "comic-sans", button: "blob", accent: "#ff00aa" });
    expect(t.primary).toBe(DEFAULT_THEME.primary);
    expect(t.headingFont).toBe(DEFAULT_THEME.headingFont);
    expect(t.button).toBe("rounded");
    expect(t.accent).toBe("#FF00AA");
  });
});

describe("renderer safety", () => {
  it("escapes user text and neutralises unsafe links", () => {
    const html = renderEmailHtml([hero({ headline: "<script>alert(1)</script>", buttonUrl: "javascript:alert(1)" })]);
    expect(html).not.toContain("<script>alert(1)");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("javascript:");
  });
  it("only allows https / relative / asset images", () => {
    expect(resolveImageUrl("javascript:alert(1)", DEFAULT_THEME)).toBe("");
    expect(resolveImageUrl("data:image/png;base64,AAAA", DEFAULT_THEME)).toBe("");
    expect(resolveImageUrl("http://insecure.example/x.png", DEFAULT_THEME)).toBe("");
    expect(resolveImageUrl("https://cdn.example/x.png", DEFAULT_THEME)).toBe("https://cdn.example/x.png");
    expect(resolveImageUrl(art("bottle"), DEFAULT_THEME)).toMatch(/^\/api\/email-assets\/art\?name=bottle&c1=[0-9A-F]{6}&c2=[0-9A-F]{6}&c3=[0-9A-F]{6}$/);
  });
  it("highlights [[accent]] words and keeps tracking links when sending", () => {
    const html = renderEmailHtml([hero()], { tracking: { recipientId: "r-1" } });
    expect(html).toContain("world</span>");
    expect(html).toContain("/api/t/click/r-1?url=https%3A%2F%2Fexample.com");
    expect(html).toContain("/api/t/open/r-1");
  });
  it("is mobile-friendly: stacking columns and a viewport tag", () => {
    const html = renderEmailHtml([{ id: "c", type: "cards", columns: 2, items: [{ title: "A" }, { title: "B" }] } as EmailBlock]);
    expect(html).toContain('class="stack"');
    expect(html).toContain("max-width:620px");
    expect(html).toContain('name="viewport"');
  });
  it("renders a text version of every block type", () => {
    const text = renderEmailText(TEMPLATE_LIBRARY[0].blocks);
    expect(text.length).toBeGreaterThan(50);
    expect(text).not.toMatch(/<[a-z]/i);
  });
});

describe("merge tags", () => {
  const vars = buildVars({ firstName: "Sam <b>", lastName: "Lee", email: "s@x.com", businessName: "Acme & Co" });
  it("replaces known tags, escapes values in HTML and honours fallbacks", () => {
    expect(applyMergeTags("Hi {{first_name}} at {{business_name}}", vars, "html")).toBe("Hi Sam &lt;b&gt; at Acme &amp; Co");
    expect(applyMergeTags("Hi {{first_name|there}}", buildVars({ firstName: "" }), "text")).toBe("Hi there");
    expect(applyMergeTags("{{ first_name | friend }}", buildVars({}), "text")).toBe("friend");
  });
  it("leaves unknown tags untouched", () => {
    expect(applyMergeTags("{{coupon_code}}", vars, "text")).toBe("{{coupon_code}}");
  });
});

describe("section editing validation", () => {
  it("accepts valid values and rejects bad ones without changing anything", () => {
    const block = hero();
    const ok = setSectionField(block, "headline", "New headline");
    expect(ok && (ok as { headline: string }).headline).toBe("New headline");
    expect(setSectionField(block, "headline", "x".repeat(500))).toBeNull();
    expect(setSectionField(block, "buttonUrl", "javascript:alert(1)")).toBeNull();
    expect(setSectionField(block, "bg", "red; x:y")).toBeNull();
    expect(setSectionField(block, "align", "diagonal")).toBeNull();
    expect(setSectionField(block, "type", "text")).toBeNull();
    expect(setSectionField(block, "imageUrl", "data:text/html,<script>")).toBeNull();
    expect(setSectionField(block, "imageUrl", "asset:art?name=bottle&c1=@primary")).not.toBeNull();
    expect((block as { headline: string }).headline).toBe("Hello [[world]]");
  });
  it("clears optional colours and coerces numbers/toggles", () => {
    const cleared = setSectionField(hero(), "bg", "") as unknown as Record<string, unknown>;
    expect("bg" in cleared).toBe(false);
    const wave = setSectionField({ id: "w", type: "wave", shape: "wave", top: "@surface", bottom: "@primary", height: 50 }, "height", "9999") as { height: number };
    expect(wave.height).toBe(140);
  });
  it("edits nested items by index and refuses bad paths", () => {
    const cards = { id: "c", type: "cards", columns: 2, items: [{ title: "A" }, { title: "B" }] } as EmailBlock;
    const edited = setSectionField(cards, "items.1.title", "Renamed") as unknown as { items: { title: string }[] };
    expect(edited.items[1].title).toBe("Renamed");
    expect(setSectionField(cards, "items.9.title", "x")).toBeNull();
    expect(setSectionField(cards, "items.0.nope", "x")).toBeNull();
    expect(setSectionField(cards, "items", "x")).toBeNull();
  });
  it("adds, removes and reorders items within limits", () => {
    const list = { id: "l", type: "list", style: "numbers", items: [{ title: "1" }, { title: "2" }] } as EmailBlock;
    const added = applyItemOp(list, "items", "add", -1) as unknown as { items: unknown[] };
    expect(added.items).toHaveLength(3);
    const moved = applyItemOp(list, "items", "down", 0) as unknown as { items: { title: string }[] };
    expect(moved.items[0].title).toBe("2");
    expect(applyItemOp(list, "items", "up", 0)).toBeNull();
    const one = { ...list, items: [{ title: "only" }] } as EmailBlock;
    expect(applyItemOp(one, "items", "remove", 0)).toBeNull(); // min 1
    expect(applyItemOp(list, "nope", "add", -1)).toBeNull();
  });
  it("only treats section types as editable sections", () => {
    expect(isSectionType("hero")).toBe(true);
    expect(isSectionType("heading")).toBe(false);
    expect(isSectionType("__proto__")).toBe(false);
    expect(isSectionType("constructor")).toBe(false);
    expect(isSectionType("toString")).toBe(false);
  });
});

describe("free vs pro access", () => {
  it("lets Free use only Free templates; paid plans use everything", () => {
    expect(canUseTemplate("Free", "FREE")).toBe(true);
    expect(canUseTemplate("Free", "PRO")).toBe(false);
    expect(canUseTemplate("free", "PRO")).toBe(false);
    expect(canUseTemplate(undefined, "PRO")).toBe(false);
    expect(canUseTemplate("Starter", "PRO")).toBe(true);
    expect(canUseTemplate("Enterprise", "PRO")).toBe(true);
  });
});

describe("template library integrity", () => {
  it("has the advertised free / pro split and unique keys", () => {
    expect(FREE_TEMPLATE_COUNT).toBe(18);
    expect(PRO_TEMPLATE_COUNT).toBe(29);
    const keys = TEMPLATE_LIBRARY.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(TEMPLATE_LIBRARY.map((t) => t.name)).size).toBe(TEMPLATE_LIBRARY.length);
  });
  it.each(TEMPLATE_LIBRARY.map((t) => [t.key, t] as const))("%s renders and every field passes the editor's own validation", (_key, t) => {
    expect(t.subject.length).toBeGreaterThan(3);
    expect(t.blocks.length).toBeGreaterThan(3);
    const ids = t.blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const block of t.blocks) {
      if (!isSectionType(block.type)) continue;
      const def = SECTION_DEFS[block.type];
      const record = block as unknown as Record<string, unknown>;
      for (const field of def.fields) {
        if (field.kind === "items") {
          const items = (record[field.key] as Record<string, unknown>[] | undefined) ?? [];
          expect(items.length).toBeGreaterThanOrEqual(field.min);
          expect(items.length).toBeLessThanOrEqual(field.max);
          items.forEach((item, i) => {
            for (const sub of field.fields) {
              const value = item[sub.key];
              if (value === undefined) continue;
              expect(setSectionField(block, `${field.key}.${i}.${sub.key}`, String(value)), `${t.key} ${block.type}.${field.key}.${i}.${sub.key}`).not.toBeNull();
            }
          });
        } else if (record[field.key] !== undefined && field.kind !== "toggle") {
          expect(setSectionField(block, field.key, String(record[field.key])), `${t.key} ${block.type}.${field.key}`).not.toBeNull();
        }
      }
    }
    const html = renderEmailHtml(t.blocks, { theme: t.theme });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object");
    expect(html).not.toMatch(/\[\[|\]\]/);
    expect(renderEmailText(t.blocks, { theme: t.theme })).not.toContain("undefined");
  });
});
