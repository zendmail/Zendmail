import { describe, expect, it } from "vitest";
import { findEditableField, normalizeShown } from "@/lib/email-builder/inline-edit";
import { createDefaultBlock } from "@/lib/email-blocks";
import type { EmailBlock } from "@/db/schema";

describe("inline editing field lookup", () => {
  it("ignores markup when matching what the preview shows", () => {
    expect(normalizeShown("Save **20%** on [[everything]]\n today")).toBe("Save 20% on everything today");
  });

  it("finds a hero headline even when it has accent markup", () => {
    const hero = { ...createDefaultBlock("hero"), headline: "Big [[summer]] sale" } as EmailBlock;
    expect(findEditableField(hero, "Big summer sale")?.path).toBe("headline");
  });

  it("finds fields inside list items with their path", () => {
    const list = createDefaultBlock("list");
    if (list.type !== "list") throw new Error("expected list");
    const second = list.items[1].title;
    expect(findEditableField(list, second)?.path).toBe("items.1.title");
  });

  it("refuses ambiguous text instead of guessing", () => {
    const list = createDefaultBlock("list");
    if (list.type !== "list") throw new Error("expected list");
    const dup = { ...list, items: list.items.map((i) => ({ ...i, title: "Same" })) } as EmailBlock;
    expect(findEditableField(dup, "Same")).toBeNull();
  });

  it("returns null for unknown text and for the rich Text block", () => {
    expect(findEditableField(createDefaultBlock("heading"), "Not on the page")).toBeNull();
    expect(findEditableField(createDefaultBlock("text"), "Write your message here.")).toBeNull();
  });

  it("finds a heading and a button label", () => {
    const heading = createDefaultBlock("heading");
    if (heading.type !== "heading") throw new Error();
    expect(findEditableField(heading, heading.text)?.path).toBe("text");
    const button = createDefaultBlock("button");
    if (button.type !== "button") throw new Error();
    expect(findEditableField(button, button.label)?.path).toBe("label");
  });
});
