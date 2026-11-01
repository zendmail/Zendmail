import type { EmailBlock } from "@/db/schema";

type Social = Extract<EmailBlock, { type: "social" }>;

/**
 * Social icons use each network's own colours unless the block was deliberately given its own colour. Older blocks
 * stored the theme colour ("@primary", the former default) without saying why, so that value counts as "never chosen".
 */
export function socialIconStyle(block: Pick<Social, "iconStyle" | "iconBg">): "brand" | "color" {
  if (block.iconStyle) return block.iconStyle;
  return block.iconBg && block.iconBg !== "@primary" ? "color" : "brand";
}

/** Makes the effective style explicit on social blocks so the editor shows (and saves) what the preview draws. */
export function withExplicitSocialStyle(blocks: EmailBlock[]): EmailBlock[] {
  return blocks.map((b) => {
    if (b.type !== "social" || b.iconStyle) return b;
    const style = socialIconStyle(b);
    const { iconBg, ...rest } = b;
    return style === "brand" ? ({ ...rest, iconStyle: "brand" } as EmailBlock) : ({ ...b, iconBg, iconStyle: "color" } as EmailBlock);
  });
}
