import type { EmailBlock, EmailTheme } from "@/db/schema";
import { newBlockId } from "../email-blocks";
import { coerceField, isSectionType, SECTION_DEFS, type FieldDef } from "./schema";
import { DEFAULT_THEME, parseTheme } from "./theme";

/**
 * The editable email document and its server-side sanitiser. The browser editor works on this shape and
 * the save actions run every incoming document through `sanitizeDocument`, rebuilding each block from a
 * whitelist (the section schema) so nothing the client sends can smuggle in unknown fields, script URLs
 * or raw HTML. Pure module: safe on both client and server.
 */

export type EmailDocument = { blocks: EmailBlock[]; theme: EmailTheme };

export const MAX_BLOCKS = 80;
export const MAX_DOCUMENT_BYTES = 300_000;
const ID_OK = /^[A-Za-z0-9_-]{1,64}$/;

export class DocumentError extends Error {}

const asString = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function buildFields(fields: FieldDef[], source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = source[field.key];
    if (field.kind === "items") {
      const list = Array.isArray(raw) ? raw.slice(0, field.max) : [];
      out[field.key] = list.filter(isRecord).map((item) => buildFields(field.fields, item));
      continue;
    }
    if (raw === undefined || raw === null) continue;
    const result = coerceField(field, asString(raw));
    if (result.ok && result.value !== undefined) out[field.key] = result.value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rich text (the legacy "text" block stores HTML, which the renderer prints as-is)
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h2", "h3", "blockquote"]);
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\{\{\s*[a-z_]+\s*\}\})/i;

const escapeText = (s: string) => s.replace(/&(?!(?:amp|lt|gt|quot|#\d+);)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function sanitizeRichText(html: string): string {
  const input = html.slice(0, 20_000);
  let out = "";
  let last = 0;
  const tag = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  for (let m = tag.exec(input); m; m = tag.exec(input)) {
    out += escapeText(input.slice(last, m.index));
    last = tag.lastIndex;
    const name = m[2].toLowerCase();
    if (!ALLOWED_TAGS.has(name)) continue; // drop the tag, keep its text
    if (m[1]) {
      if (name !== "br") out += `</${name}>`;
      continue;
    }
    if (name === "a") {
      const href = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[3]);
      const value = (href?.[1] ?? href?.[2] ?? "").trim();
      out += SAFE_HREF.test(value) ? `<a href="${value.replace(/"/g, "&quot;")}" target="_blank">` : "<a>";
    } else {
      out += name === "br" ? "<br/>" : `<${name}>`;
    }
  }
  out += escapeText(input.slice(last));
  return out;
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function sanitizeBlock(raw: unknown, seen: Set<string>): EmailBlock | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;
  let id = typeof raw.id === "string" && ID_OK.test(raw.id) ? raw.id : newBlockId();
  while (seen.has(id)) id = newBlockId();
  seen.add(id);

  const field = (kind: FieldDef["kind"], key: string, max = 200): unknown => {
    const def = { key, label: key, kind, max } as FieldDef;
    const result = coerceField(def, asString(raw[key]));
    return result.ok ? result.value : undefined;
  };
  const compact = <T extends Record<string, unknown>>(o: T) => {
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    return o;
  };

  switch (raw.type) {
    case "heading":
      return compact({ id, type: "heading", text: field("text", "text", 200) ?? "", color: field("color", "color") }) as EmailBlock;
    case "text":
      return compact({ id, type: "text", html: sanitizeRichText(asString(raw.html)), color: field("color", "color") }) as EmailBlock;
    case "image":
      return { id, type: "image", url: (field("image", "url") as string) ?? "", alt: (field("text", "alt", 200) as string) ?? "" };
    case "button":
      return compact({
        id, type: "button",
        label: field("text", "label", 60) ?? "",
        url: field("url", "url") ?? "",
        backgroundColor: field("color", "backgroundColor"),
        textColor: field("color", "textColor"),
      }) as EmailBlock;
    case "divider":
      return { id, type: "divider" };
    case "spacer": {
      const h = Math.round(Number(raw.height));
      return { id, type: "spacer", height: Number.isFinite(h) ? Math.max(0, Math.min(200, h)) : 24 };
    }
    default:
      if (!isSectionType(raw.type)) return null;
      return { id, type: raw.type, ...buildFields(SECTION_DEFS[raw.type].fields, raw) } as unknown as EmailBlock;
  }
}

export function sanitizeBlocks(input: unknown): EmailBlock[] {
  if (!Array.isArray(input)) throw new DocumentError("Blocks must be a list.");
  if (input.length > MAX_BLOCKS) throw new DocumentError(`An email can have at most ${MAX_BLOCKS} sections.`);
  const seen = new Set<string>();
  return input.map((b) => sanitizeBlock(b, seen)).filter((b): b is EmailBlock => b !== null);
}

export function sanitizeDocument(input: unknown): EmailDocument {
  if (!isRecord(input)) throw new DocumentError("Invalid document.");
  if (JSON.stringify(input).length > MAX_DOCUMENT_BYTES) throw new DocumentError("This email is too large to save.");
  return {
    blocks: sanitizeBlocks(input.blocks),
    theme: input.theme ? parseTheme(input.theme) : DEFAULT_THEME,
  };
}
