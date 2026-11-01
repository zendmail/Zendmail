import type { EmailBlock } from "@/db/schema";
import { fieldsFor } from "./catalog";
import type { FieldDef } from "./schema";

/**
 * Inline editing on the canvas: the preview iframe only knows the text it shows, so the editor maps that text back to the
 * one block field it came from. Pure module (no DOM) so the mapping is unit-tested.
 */

/** What the preview shows for a field value: markup stripped (**bold**, [[accent]]), whitespace collapsed. */
export function normalizeShown(value: string): string {
  return value.replace(/\[\[|\]\]|\*\*/g, "").replace(/\s+/g, " ").trim();
}

type Hit = { path: string };

function collect(fields: FieldDef[], source: Record<string, unknown>, prefix: string, out: Hit[], values: Map<string, string>) {
  for (const def of fields) {
    if (def.kind === "text" || def.kind === "textarea") {
      const v = source[def.key];
      if (typeof v === "string" && v.trim()) {
        const path = prefix ? `${prefix}.${def.key}` : def.key;
        out.push({ path });
        values.set(path, v);
      }
    } else if (def.kind === "items") {
      const list = source[def.key];
      if (Array.isArray(list)) {
        list.forEach((item, i) => {
          if (item && typeof item === "object") collect(def.fields, item as Record<string, unknown>, `${prefix ? `${prefix}.` : ""}${def.key}.${i}`, out, values);
        });
      }
    }
  }
}

/**
 * Finds the single plain-text field of `block` whose shown text equals `shown`. Returns null when nothing matches or when
 * two fields show identical text (ambiguous: we never guess which one to overwrite). Rich-text blocks are edited as HTML instead.
 */
export function findEditableField(block: EmailBlock, shown: string): { path: string; current: string } | null {
  if (block.type === "text") return null;
  const target = normalizeShown(shown);
  if (!target) return null;
  const hits: Hit[] = [];
  const values = new Map<string, string>();
  collect(fieldsFor(block.type), block as unknown as Record<string, unknown>, "", hits, values);
  const matches = hits.filter((h) => normalizeShown(values.get(h.path) ?? "") === target);
  if (matches.length !== 1) return null;
  return { path: matches[0].path, current: values.get(matches[0].path) ?? "" };
}

/** Whether a block is edited as one rich-text region (the free-form Text block). */
export function isRichBlock(block: EmailBlock) {
  return block.type === "text";
}
