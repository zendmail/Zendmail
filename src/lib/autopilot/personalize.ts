import type { EmailBlock, EmailTheme } from "@/db/schema";
import { newBlockId } from "../email-blocks";
import type { TemplateDefinition } from "../template-library/helpers";
import { isHttpsImage, type ProductLite } from "./profile";

/**
 * Turns a generic library template into an email for THIS business: real brand, real products with their photos
 * and prices, real store link, and the AI-written (or fallback) copy.
 *
 * Safety by construction. A template is a sample, so anything in it that could be a false statement about a real
 * business is removed instead of sent: coupon codes, testimonials, social links to nowhere, and any text that
 * makes a price, discount, shipping, guarantee or deadline claim. The user reviews everything before it can send.
 */

export type Brand = { name: string; logoUrl: string | null; website: string | null; currency: string };

export type Copy = {
  subject: string;
  previewText: string;
  eyebrow?: string;
  headline?: string;
  text?: string;
  buttonLabel?: string;
  /** Neutral supporting line used for callout / split sections. */
  supporting?: { headline: string; text: string };
};

export type Personalized = { subject: string; previewText: string; blocks: EmailBlock[]; theme: EmailTheme; warnings: string[] };

const RISKY = /(\d+\s*%|%\s*off|\boff\b|free\s+(shipping|delivery|returns|gift)|guarantee|money.?back|\b(usd|eur|gbp|aed|inr)\b|[$€£₹]\s?\d|\d+\s?(hours?|hrs?|days?|minutes?)\b|midnight|only\s+\d+|last chance|ends\s|deadline|countdown|sold out|restock)/i;

export const isRisky = (text: string | undefined) => !!text && RISKY.test(text);

export function formatPrice(price: number | null, currency: string): string | undefined {
  if (price === null || !Number.isFinite(price) || price <= 0) return undefined;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: price % 1 === 0 ? 0 : 2 }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

function cleanUrl(website: string | null): string {
  return website && /^https:\/\//i.test(website) ? website : "";
}

type Loose = Record<string, unknown>;

/** Final sweep over every block: removes or neutralises any remaining text that makes a claim we cannot verify. Returns false to drop the block. */
function scrub(b: Loose, copy: Copy, note: (w: string) => void): boolean {
  let touched = false;
  for (const key of ["eyebrow", "text", "subheading", "badge", "heading"]) {
    if (typeof b[key] === "string" && isRisky(b[key] as string)) { delete b[key]; touched = true; }
  }
  if (typeof b.headline === "string" && isRisky(b.headline)) { b.headline = copy.supporting?.headline ?? "Thanks for being part of our community"; touched = true; }
  if (typeof b.buttonLabel === "string" && isRisky(b.buttonLabel)) { b.buttonLabel = "Learn more"; touched = true; }
  if (typeof b.label === "string" && isRisky(b.label)) { b.label = "Learn more"; touched = true; }
  if (typeof b.html === "string" && isRisky(b.html)) { note("Some text that made claims we cannot verify was removed."); return false; }
  if (Array.isArray(b.items)) {
    const before = b.items.length;
    b.items = (b.items as Loose[]).filter((i) => !["title", "text", "quote", "label"].some((k) => typeof i[k] === "string" && isRisky(i[k] as string)));
    if ((b.items as unknown[]).length === 0 && before > 0) { note("Some text that made claims we cannot verify was removed."); return false; }
    if ((b.items as unknown[]).length < before) touched = true;
    for (const i of b.items as Loose[]) if (typeof i.buttonLabel === "string" && isRisky(i.buttonLabel)) i.buttonLabel = "Learn more";
  }
  if (touched) note("Some text that made claims we cannot verify (discounts, prices, deadlines) was removed. Add your own in the editor.");
  return true;
}

export function personalizeTemplate(def: TemplateDefinition, ctx: { brand: Brand; products: ProductLite[]; copy: Copy; usesProducts: boolean }): Personalized {
  const { brand, copy } = ctx;
  const url = cleanUrl(brand.website);
  const warnings: string[] = [];
  const note = (w: string) => { if (!warnings.includes(w)) warnings.push(w); };
  if (!url) note("Add your website in Workspace settings so buttons link to your store.");

  const withPhotos = ctx.products.filter((p) => isHttpsImage(p.imageUrl));
  const pool = ctx.usesProducts ? ctx.products : [];
  let nextProduct = 0;
  let nextPhoto = 0;
  let heroDone = false;

  const fixUrl = (v: unknown) => (typeof v === "string" && /example\.com/i.test(v) ? url : v);
  const out: EmailBlock[] = [];

  for (const original of def.blocks) {
    const b = JSON.parse(JSON.stringify(original)) as Record<string, unknown> & { type: EmailBlock["type"] };
    b.id = newBlockId();
    for (const key of ["buttonUrl", "url"]) if (key in b) b[key] = fixUrl(b[key]);

    switch (b.type) {
      case "coupon":
        note("Discount-code sections were left out. Add your own Coupon section in the editor if you have a real code.");
        continue;
      case "testimonials":
        note("Sample customer reviews were left out. Add real reviews in the editor if you have them.");
        continue;
      case "social":
        note("Social icons were left out. Add your own links in the editor.");
        continue;
      case "header":
        b.brand = brand.name;
        b.logoUrl = isHttpsImage(brand.logoUrl) ? brand.logoUrl : undefined;
        b.links = url ? [{ label: "Shop", url }] : [];
        break;
      case "hero": {
        if (!heroDone) {
          heroDone = true;
          if (copy.eyebrow !== undefined) b.eyebrow = copy.eyebrow;
          if (copy.headline) b.headline = copy.headline;
          if (copy.text) b.text = copy.text;
          if (copy.buttonLabel) b.buttonLabel = copy.buttonLabel;
        } else if (isRisky(`${b.headline} ${b.text}`)) {
          b.headline = copy.supporting?.headline ?? `Thanks for being part of ${brand.name}`;
          b.text = copy.supporting?.text ?? "";
        }
        if (typeof b.imageUrl === "string" && b.imageUrl) {
          const photo = pool.length ? withPhotos[nextPhoto % Math.max(1, withPhotos.length)] : undefined;
          if (photo && withPhotos.length) { b.imageUrl = photo.imageUrl; b.imageAlt = photo.name; nextPhoto += 1; }
        }
        break;
      }
      case "split": {
        const photo = pool.length ? withPhotos[nextPhoto % Math.max(1, withPhotos.length)] : undefined;
        if (photo) { b.imageUrl = photo.imageUrl; b.imageAlt = photo.name; nextPhoto += 1; }
        if (isRisky(`${b.headline} ${b.text}`)) {
          b.headline = copy.supporting?.headline ?? brand.name;
          b.text = copy.supporting?.text ?? "";
        }
        break;
      }
      case "callout":
        if (isRisky(`${b.headline} ${b.text}`)) {
          b.headline = copy.supporting?.headline ?? `Thanks for being part of ${brand.name}`;
          b.text = copy.supporting?.text ?? "";
        }
        break;
      case "cards": {
        if (pool.length === 0) { note("Product sections were left out because no products are synced yet."); continue; }
        const slots = Math.min(pool.length, Math.max(2, (b.items as unknown[]).length), 4);
        const chosen = Array.from({ length: slots }, (_, i) => pool[(nextProduct + i) % pool.length]);
        nextProduct += slots;
        const label = ((b.items as { buttonLabel?: string }[])[0]?.buttonLabel as string | undefined) ?? "Shop now";
        b.columns = Math.max(1, Math.min(slots, (b.columns as number) || 2)) as 1 | 2 | 3;
        b.items = chosen.map((p) => ({
          ...(isHttpsImage(p.imageUrl) ? { imageUrl: p.imageUrl } : {}),
          title: p.name.slice(0, 80),
          price: formatPrice(p.price, brand.currency),
          buttonLabel: label,
          buttonUrl: url,
        }));
        if (typeof b.heading === "string" && isRisky(b.heading)) b.heading = "Featured products";
        if (typeof b.subheading === "string" && isRisky(b.subheading)) delete b.subheading;
        break;
      }
      case "list": {
        const items = (b.items as { title: string; text?: string }[]).filter((i) => !isRisky(`${i.title} ${i.text ?? ""}`));
        if (items.length === 0) { note("A benefits list was left out because it made claims we cannot verify (shipping, guarantees, discounts)."); continue; }
        if (items.length < (b.items as unknown[]).length) note("Some list items were removed because they made claims we cannot verify. Add your own in the editor.");
        b.items = items;
        break;
      }
      case "links":
        b.links = url ? [{ label: "Visit our shop", url }] : [];
        if (!url) continue;
        break;
      default:
        break;
    }
    if (!scrub(b, copy, note)) continue;
    out.push(b as unknown as EmailBlock);
  }

  return { subject: copy.subject, previewText: copy.previewText, blocks: out, theme: def.theme, warnings };
}
