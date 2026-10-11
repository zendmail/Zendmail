import type { EmailBlock, EmailBlockType, EmailTheme, templateCategory } from "@/db/schema";
import { DEFAULT_THEME } from "../email-builder/theme";

export type TemplateCategory = (typeof templateCategory.enumValues)[number];

export type TemplateDefinition = {
  /** Stable id. Seeds update the template with this key in place, so never rename a key. */
  key: string;
  /** Existing built-in template (by name) that this definition replaces in place, keeping campaign links intact. */
  replacesName?: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tier: "FREE" | "PRO";
  sortOrder: number;
  theme: EmailTheme;
  subject: string;
  previewText: string;
  blocks: EmailBlock[];
};

type Props<T extends EmailBlockType> = Omit<Extract<EmailBlock, { type: T }>, "id" | "type">;

let seq = 0;

/** Builds a block with a stable id. */
export function mk<T extends EmailBlockType>(type: T, props: Props<T>): EmailBlock {
  seq += 1;
  return { id: `tpl_${seq}`, type, ...props } as EmailBlock;
}

export const URL_PLACEHOLDER = "https://example.com";

export function theme(overrides: Partial<EmailTheme>): EmailTheme {
  return { ...DEFAULT_THEME, ...overrides };
}

/** Footer used by most templates: social icons + legal line. */
export function standardFooter(opts: { bg?: string; color?: string; text?: string; iconBg?: string; links?: boolean } = {}): EmailBlock[] {
  const { bg = "@surface", color, text = "You're receiving this email because you signed up at {{business_name}}.\nNo longer want these emails?", iconBg = "@primary", links = false } = opts;
  return [
    ...(links
      ? [mk("links", { style: "inline", bg, color, links: [{ label: "Shop all", url: URL_PLACEHOLDER }, { label: "About us", url: URL_PLACEHOLDER }, { label: "Contact", url: URL_PLACEHOLDER }] })]
      : []),
    mk("social", { bg, iconBg, links: [{ network: "instagram", url: "https://instagram.com" }, { network: "facebook", url: "https://facebook.com" }, { network: "x", url: "https://x.com" }, { network: "tiktok", url: "https://tiktok.com" }] }),
    mk("footer", { bg, color, text }),
  ];
}
