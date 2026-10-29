import type { EmailBlock } from "@/db/schema";
import { ART_NAMES } from "./assets";
import { isValidColorValue } from "./theme";

/**
 * Editing schema for the "section" blocks (hero, cards, list …). It drives BOTH the editor forms and the
 * server-side validation of every value a user saves, so what the UI offers and what the server accepts
 * can never drift apart. Pure module: safe to import from client components and server actions.
 */

export const ICON_OPTIONS = [
  "check", "x", "bolt", "shield", "heart", "leaf", "truck", "gift", "clock", "sparkles", "users", "chart", "mail", "map-pin",
  "calendar", "lock", "droplet", "award", "refresh", "message", "package", "tag", "percent", "trophy", "target", "smile",
  "phone", "star", "cart", "file", "settings", "rocket", "flask", "home", "brain", "sun", "moon", "key", "globe",
] as const;

const NETWORKS = ["instagram", "facebook", "x", "tiktok", "youtube", "linkedin"] as const;
const iconSelect = ICON_OPTIONS.map((v) => ({ value: v, label: v.replace("-", " ") }));
const opt = (...values: string[]) => values.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

export type FieldDef =
  | { key: string; label: string; kind: "text" | "textarea" | "url" | "image" | "color"; max?: number; placeholder?: string; help?: string }
  | { key: string; label: string; kind: "number"; min: number; max: number }
  | { key: string; label: string; kind: "toggle" }
  | { key: string; label: string; kind: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; kind: "items"; itemLabel: string; min: number; max: number; fields: FieldDef[]; defaultItem: Record<string, unknown> };

export type SectionType = Exclude<EmailBlock["type"], "heading" | "text" | "image" | "button" | "divider" | "spacer">;

type SectionDef = { label: string; fields: FieldDef[]; summary: (block: Record<string, unknown>) => string };

const color = (key: string, label: string): FieldDef => ({ key, label, kind: "color" });
const str = (v: unknown) => (typeof v === "string" ? v : "");
const firstLine = (v: unknown) => str(v).replace(/\[\[|\]\]|\*\*/g, "").split("\n")[0].slice(0, 60);

const linkItems = (key: string, label: string): FieldDef => ({
  key, label, kind: "items", itemLabel: "Link", min: 0, max: 8, defaultItem: { label: "New link", url: "https://example.com" },
  fields: [{ key: "label", label: "Label", kind: "text", max: 40 }, { key: "url", label: "URL", kind: "url" }],
});

export const SECTION_DEFS: Record<SectionType, SectionDef> = {
  header: {
    label: "Header",
    summary: (b) => str(b.brand),
    fields: [
      { key: "brand", label: "Brand name", kind: "text", max: 60 },
      { key: "logoUrl", label: "Logo image (optional)", kind: "image" },
      linkItems("links", "Navigation links"),
      color("bg", "Background"), color("color", "Text colour"),
    ],
  },
  hero: {
    label: "Hero",
    summary: (b) => firstLine(b.headline),
    fields: [
      { key: "eyebrow", label: "Small label above", kind: "text", max: 40 },
      { key: "headline", label: "Headline", kind: "textarea", max: 160, help: "Wrap words in [[double brackets]] to highlight them in the accent colour." },
      { key: "text", label: "Text", kind: "textarea", max: 400 },
      { key: "imageUrl", label: "Image", kind: "image" },
      { key: "imageAlt", label: "Image description", kind: "text", max: 120 },
      { key: "imagePosition", label: "Image position", kind: "select", options: opt("top", "bottom") },
      { key: "buttonLabel", label: "Button label", kind: "text", max: 40 },
      { key: "buttonUrl", label: "Button link", kind: "url" },
      { key: "align", label: "Text alignment", kind: "select", options: opt("center", "left") },
      color("bg", "Background"), color("color", "Text colour"), color("accent", "Accent colour"),
    ],
  },
  coupon: {
    label: "Discount code",
    summary: (b) => `${firstLine(b.headline)} · ${str(b.code)}`,
    fields: [
      { key: "eyebrow", label: "Small label above", kind: "text", max: 40 },
      { key: "headline", label: "Big headline (e.g. 20% OFF)", kind: "text", max: 40 },
      { key: "text", label: "Text", kind: "textarea", max: 300 },
      { key: "code", label: "Discount code", kind: "text", max: 24 },
      { key: "buttonLabel", label: "Button label", kind: "text", max: 40 },
      { key: "buttonUrl", label: "Button link", kind: "url" },
      color("bg", "Background"), color("color", "Text colour"), color("accent", "Accent colour"),
    ],
  },
  cards: {
    label: "Cards / products",
    summary: (b) => firstLine(b.heading) || `${(b.items as unknown[] | undefined)?.length ?? 0} cards`,
    fields: [
      { key: "heading", label: "Section heading", kind: "text", max: 80 },
      { key: "subheading", label: "Sub-heading", kind: "text", max: 200 },
      { key: "columns", label: "Columns", kind: "select", options: [{ value: "1", label: "1 column" }, { value: "2", label: "2 columns" }, { value: "3", label: "3 columns" }] },
      { key: "boxed", label: "Show each card in a box", kind: "toggle" },
      {
        key: "items", label: "Cards", kind: "items", itemLabel: "Card", min: 1, max: 9,
        defaultItem: { title: "New item", text: "Short description.", price: "", buttonLabel: "Shop now", buttonUrl: "https://example.com" },
        fields: [
          { key: "imageUrl", label: "Image", kind: "image" },
          { key: "icon", label: "Icon (when no image)", kind: "select", options: [{ value: "", label: "None" }, ...iconSelect] },
          { key: "badge", label: "Badge (e.g. New, -30%)", kind: "text", max: 16 },
          { key: "title", label: "Title", kind: "text", max: 80 },
          { key: "text", label: "Text", kind: "textarea", max: 240 },
          { key: "price", label: "Price", kind: "text", max: 20 },
          { key: "buttonLabel", label: "Button label", kind: "text", max: 40 },
          { key: "buttonUrl", label: "Button link", kind: "url" },
        ],
      },
      color("bg", "Section background"), color("cardBg", "Card background"), color("color", "Text colour"), color("accent", "Accent colour"),
    ],
  },
  list: {
    label: "Feature list / steps",
    summary: (b) => firstLine(b.heading) || `${(b.items as unknown[] | undefined)?.length ?? 0} items`,
    fields: [
      { key: "heading", label: "Section heading", kind: "text", max: 80 },
      { key: "subheading", label: "Sub-heading", kind: "text", max: 200 },
      { key: "style", label: "Style", kind: "select", options: [{ value: "icons", label: "Icons" }, { value: "checks", label: "Check marks" }, { value: "numbers", label: "Numbered steps" }, { value: "bullets", label: "Bullets" }] },
      { key: "boxed", label: "Show each row in a box", kind: "toggle" },
      {
        key: "items", label: "Items", kind: "items", itemLabel: "Item", min: 1, max: 10,
        defaultItem: { icon: "sparkles", title: "New item", text: "A short description." },
        fields: [
          { key: "icon", label: "Icon", kind: "select", options: iconSelect },
          { key: "title", label: "Title", kind: "text", max: 80 },
          { key: "text", label: "Text", kind: "textarea", max: 240 },
        ],
      },
      color("bg", "Section background"), color("cardBg", "Row background"), color("color", "Text colour"), color("accent", "Accent colour"),
    ],
  },
  testimonials: {
    label: "Testimonials",
    summary: (b) => firstLine(b.heading) || `${(b.items as unknown[] | undefined)?.length ?? 0} reviews`,
    fields: [
      { key: "heading", label: "Section heading", kind: "text", max: 80 },
      { key: "boxed", label: "Show each review in a box", kind: "toggle" },
      {
        key: "items", label: "Reviews", kind: "items", itemLabel: "Review", min: 1, max: 5,
        defaultItem: { quote: "Wonderful product — highly recommend.", name: "Customer name", role: "", rating: 5 },
        fields: [
          { key: "quote", label: "Quote", kind: "textarea", max: 320 },
          { key: "name", label: "Name", kind: "text", max: 60 },
          { key: "role", label: "Role / detail", kind: "text", max: 60 },
          { key: "rating", label: "Stars (1–5)", kind: "number", min: 1, max: 5 },
        ],
      },
      color("bg", "Section background"), color("cardBg", "Card background"), color("color", "Text colour"), color("accent", "Accent colour"),
    ],
  },
  split: {
    label: "Image + text",
    summary: (b) => firstLine(b.headline),
    fields: [
      { key: "imageUrl", label: "Image", kind: "image" },
      { key: "imageAlt", label: "Image description", kind: "text", max: 120 },
      { key: "imageSide", label: "Image side", kind: "select", options: opt("left", "right") },
      { key: "eyebrow", label: "Small label above", kind: "text", max: 40 },
      { key: "headline", label: "Headline", kind: "text", max: 100 },
      { key: "text", label: "Text", kind: "textarea", max: 400 },
      { key: "buttonLabel", label: "Button label", kind: "text", max: 40 },
      { key: "buttonUrl", label: "Button link", kind: "url" },
      color("bg", "Background"), color("color", "Text colour"), color("accent", "Accent colour"),
    ],
  },
  callout: {
    label: "Callout box",
    summary: (b) => firstLine(b.headline),
    fields: [
      { key: "icon", label: "Icon", kind: "select", options: [{ value: "", label: "None" }, ...iconSelect] },
      { key: "headline", label: "Headline", kind: "text", max: 100 },
      { key: "text", label: "Text", kind: "textarea", max: 300 },
      { key: "buttonLabel", label: "Button label", kind: "text", max: 40 },
      { key: "buttonUrl", label: "Button link", kind: "url" },
      color("bg", "Box colour"), color("color", "Text colour"), color("accent", "Accent colour"), color("sectionBg", "Behind the box"),
    ],
  },
  wave: {
    label: "Wave divider",
    summary: (b) => str(b.shape),
    fields: [
      { key: "shape", label: "Shape", kind: "select", options: opt("wave", "curve", "dip", "slant", "drip", "scallop") },
      color("top", "Colour above"), color("bottom", "Colour below"),
      { key: "height", label: "Height (px)", kind: "number", min: 16, max: 140 },
    ],
  },
  social: {
    label: "Social icons",
    summary: (b) => `${(b.links as unknown[] | undefined)?.length ?? 0} networks`,
    fields: [
      {
        key: "links", label: "Networks", kind: "items", itemLabel: "Network", min: 0, max: 6,
        defaultItem: { network: "instagram", url: "https://instagram.com" },
        fields: [{ key: "network", label: "Network", kind: "select", options: NETWORKS.map((n) => ({ value: n, label: n === "x" ? "X (Twitter)" : n[0].toUpperCase() + n.slice(1) })) }, { key: "url", label: "Profile link", kind: "url" }],
      },
      color("bg", "Background"), color("iconBg", "Icon colour"),
    ],
  },
  links: {
    label: "Link row",
    summary: (b) => `${(b.links as unknown[] | undefined)?.length ?? 0} links`,
    fields: [
      { key: "style", label: "Style", kind: "select", options: [{ value: "inline", label: "In a row" }, { value: "pills", label: "Stacked buttons" }] },
      linkItems("links", "Links"),
      color("bg", "Background"), color("color", "Text colour"),
    ],
  },
  footer: {
    label: "Footer",
    summary: (b) => firstLine(b.text),
    fields: [
      { key: "text", label: "Footer text", kind: "textarea", max: 400, help: "The unsubscribe link is added automatically." },
      color("bg", "Background"), color("color", "Text colour"),
    ],
  },
};

export const SECTION_TYPES = Object.keys(SECTION_DEFS) as SectionType[];
export function isSectionType(type: string): type is SectionType {
  // hasOwn, not `in`: "in" also matches inherited names such as "constructor" and "__proto__".
  return Object.prototype.hasOwnProperty.call(SECTION_DEFS, type);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const URL_OK = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#|\{\{\s*[a-z_]+\s*\}\})/i;
const ASSET_OK = new RegExp(`^asset:art\\?name=(${ART_NAMES.join("|")})(&c[123]=(@[A-Za-z]+|#?[0-9a-fA-F]{6}))*$`);

export type Coerced = { ok: true; value: unknown } | { ok: false };

export function coerceField(def: FieldDef, raw: string): Coerced {
  const value = raw.replace(/\r\n/g, "\n");
  switch (def.kind) {
    case "text": {
      const v = value.replace(/\n/g, " ").trim();
      return v.length <= (def.max ?? 200) ? { ok: true, value: v } : { ok: false };
    }
    case "textarea": {
      const v = value.trim();
      return v.length <= (def.max ?? 1000) ? { ok: true, value: v } : { ok: false };
    }
    case "url": {
      const v = value.trim();
      return v === "" || (v.length <= 1000 && URL_OK.test(v)) ? { ok: true, value: v } : { ok: false };
    }
    case "image": {
      const v = value.trim();
      if (v === "") return { ok: true, value: "" };
      if (v.length > 1500) return { ok: false };
      if (/^https:\/\//i.test(v) || /^\/(?!\/)/.test(v) || ASSET_OK.test(v)) return { ok: true, value: v };
      return { ok: false };
    }
    case "color": {
      const v = value.trim();
      return v === "" ? { ok: true, value: undefined } : isValidColorValue(v) ? { ok: true, value: v } : { ok: false };
    }
    case "number": {
      const n = Math.round(Number(value));
      return Number.isFinite(n) ? { ok: true, value: Math.max(def.min, Math.min(def.max, n)) } : { ok: false };
    }
    case "toggle":
      return { ok: true, value: value === "true" };
    case "select": {
      if (!def.options.some((o) => o.value === value)) return { ok: false };
      if (def.key === "columns") return { ok: true, value: Number(value) };
      return { ok: true, value: value === "" ? undefined : value };
    }
    case "items":
      return { ok: false }; // lists change through add / remove / move, never by direct assignment
  }
}

function cloneBlock<T>(block: T): T {
  return JSON.parse(JSON.stringify(block)) as T;
}

/**
 * Sets one field. `path` is "headline" or "items.2.title". Returns the updated block, or null if the path,
 * type or value is not allowed (nothing is written in that case).
 */
export function setSectionField(block: EmailBlock, path: string, raw: string): EmailBlock | null {
  if (!isSectionType(block.type)) return null;
  const def = SECTION_DEFS[block.type];
  const parts = path.split(".");
  const next = cloneBlock(block) as unknown as Record<string, unknown>;

  const assign = (target: Record<string, unknown>, field: FieldDef, key: string) => {
    const result = coerceField(field, raw);
    if (!result.ok) return false;
    if (result.value === undefined) delete target[key];
    else target[key] = result.value;
    return true;
  };

  if (parts.length === 1) {
    const field = def.fields.find((f) => f.key === parts[0]);
    if (!field || field.kind === "items") return null;
    return assign(next, field, parts[0]) ? (next as unknown as EmailBlock) : null;
  }

  if (parts.length === 3) {
    const list = def.fields.find((f) => f.key === parts[0]);
    const index = Number(parts[1]);
    if (!list || list.kind !== "items" || !Number.isInteger(index)) return null;
    const items = next[parts[0]] as Record<string, unknown>[] | undefined;
    const item = items?.[index];
    const field = list.fields.find((f) => f.key === parts[2]);
    if (!item || !field || field.kind === "items") return null;
    return assign(item, field, parts[2]) ? (next as unknown as EmailBlock) : null;
  }
  return null;
}

export type ItemOp = "add" | "remove" | "up" | "down";

export function applyItemOp(block: EmailBlock, listKey: string, op: ItemOp, index: number): EmailBlock | null {
  if (!isSectionType(block.type)) return null;
  const list = SECTION_DEFS[block.type].fields.find((f) => f.key === listKey);
  if (!list || list.kind !== "items") return null;
  const next = cloneBlock(block) as unknown as Record<string, unknown>;
  const items = (next[listKey] as unknown[] | undefined) ?? [];

  if (op === "add") {
    if (items.length >= list.max) return null;
    items.push(cloneBlock(list.defaultItem));
  } else {
    if (!Number.isInteger(index) || index < 0 || index >= items.length) return null;
    if (op === "remove") {
      if (items.length <= list.min) return null;
      items.splice(index, 1);
    } else {
      const target = op === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= items.length) return null;
      [items[index], items[target]] = [items[target], items[index]];
    }
  }
  next[listKey] = items;
  return next as unknown as EmailBlock;
}
