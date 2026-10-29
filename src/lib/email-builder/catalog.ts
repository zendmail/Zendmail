import type { EmailBlock, EmailBlockType } from "@/db/schema";
import { coerceField, isSectionType, SECTION_DEFS, setSectionField, type FieldDef } from "./schema";
import { sanitizeRichText } from "./document";

/**
 * One uniform description of every block type the editor can add or edit: label, grouping, and the field
 * schema the settings panel renders. Section blocks come from SECTION_DEFS; the six basic blocks are
 * described here so the panel and the validator treat all blocks identically.
 */

const color = (key: string, label: string): FieldDef => ({ key, label, kind: "color" });

type BasicType = "heading" | "text" | "image" | "button" | "divider" | "spacer";

export const BASIC_DEFS: Record<BasicType, { label: string; fields: FieldDef[]; summary: (b: Record<string, unknown>) => string }> = {
  heading: { label: "Heading", summary: (b) => String(b.text ?? ""), fields: [{ key: "text", label: "Heading", kind: "text", max: 200 }, color("color", "Text colour")] },
  text: {
    label: "Text",
    summary: (b) => String(b.html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60),
    fields: [{ key: "html", label: "Content", kind: "textarea", max: 20000 }, color("color", "Text colour")],
  },
  image: { label: "Image", summary: (b) => String(b.alt ?? ""), fields: [{ key: "url", label: "Image", kind: "image" }, { key: "alt", label: "Description", kind: "text", max: 200 }] },
  button: {
    label: "Button",
    summary: (b) => String(b.label ?? ""),
    fields: [{ key: "label", label: "Label", kind: "text", max: 60 }, { key: "url", label: "Link", kind: "url" }, color("backgroundColor", "Button colour"), color("textColor", "Label colour")],
  },
  divider: { label: "Divider", summary: () => "", fields: [] },
  spacer: { label: "Spacer", summary: (b) => `${b.height ?? 24}px`, fields: [{ key: "height", label: "Height (px)", kind: "number", min: 0, max: 200 }] },
};

export function isBasicType(type: string): type is BasicType {
  return Object.prototype.hasOwnProperty.call(BASIC_DEFS, type);
}

export function fieldsFor(type: EmailBlockType): FieldDef[] {
  if (isSectionType(type)) return SECTION_DEFS[type].fields;
  return isBasicType(type) ? BASIC_DEFS[type].fields : [];
}

export function labelFor(type: string): string {
  if (isSectionType(type)) return SECTION_DEFS[type].label;
  return isBasicType(type) ? BASIC_DEFS[type].label : type;
}

export function summaryFor(block: EmailBlock): string {
  const b = block as unknown as Record<string, unknown>;
  if (isSectionType(block.type)) return SECTION_DEFS[block.type].summary(b);
  return isBasicType(block.type) ? BASIC_DEFS[block.type].summary(b) : "";
}

/** Sets one field on any block type; null when the value is not allowed (nothing is written). */
export function setBlockField(block: EmailBlock, path: string, raw: string): EmailBlock | null {
  if (isSectionType(block.type)) return setSectionField(block, path, raw);
  if (!isBasicType(block.type)) return null;
  const field = BASIC_DEFS[block.type].fields.find((f) => f.key === path);
  if (!field) return null;
  const result = coerceField(field, raw);
  if (!result.ok) return null;
  const next = { ...block } as Record<string, unknown>;
  const value = field.key === "html" && typeof result.value === "string" ? sanitizeRichText(result.value) : result.value;
  if (value === undefined) delete next[path];
  else next[path] = value;
  return next as unknown as EmailBlock;
}

export type CatalogGroup = { title: string; types: EmailBlockType[] };

export const CATALOG: CatalogGroup[] = [
  { title: "Structure", types: ["header", "footer", "wave", "divider", "spacer"] },
  { title: "Content", types: ["hero", "split", "heading", "text", "image", "button", "callout"] },
  { title: "Commerce", types: ["cards", "coupon", "testimonials"] },
  { title: "Navigation & social", types: ["list", "links", "social"] },
];

export const BLOCK_BLURBS: Record<EmailBlockType, string> = {
  header: "Logo or brand name with links",
  footer: "Sign-off, address and unsubscribe",
  wave: "Decorative shape between sections",
  divider: "A thin separating line",
  spacer: "Empty vertical space",
  hero: "Big headline, text, image and button",
  split: "Image beside a headline and text",
  heading: "A single line of large text",
  text: "Free-form paragraph text",
  image: "A full-width picture",
  button: "A standalone call-to-action",
  callout: "Highlighted message with an icon",
  cards: "Product or feature grid",
  coupon: "Discount code with a button",
  testimonials: "Customer quotes with ratings",
  list: "Benefits or steps with icons",
  links: "Row of text links or pills",
  social: "Social network icons",
};
