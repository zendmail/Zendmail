import type { EmailBlock, EmailBlockType, EmailTheme } from "@/db/schema";
import { art } from "./email-builder/assets";
import { renderEmailHtml, renderEmailText, type RenderOptions, type TrackingContext } from "./email-builder/render";

export type { TrackingContext } from "./email-builder/render";

/**
 * Public entry points for turning a block array into an email. The rendering engine lives in
 * ./email-builder (table-based, theme-aware, merge-tag aware); these thin wrappers keep the original
 * call signatures used across campaigns, previews, automations and the AI writer.
 *
 * When `tracking` is provided, an open pixel is injected and every link (buttons, unsubscribe) is
 * rewritten through the click-tracking redirect for that recipient.
 */
export function renderBlocksToHtml(
  blocks: EmailBlock[],
  tracking: TrackingContext = null,
  options: Omit<RenderOptions, "tracking"> = {}
): string {
  return renderEmailHtml(blocks, { ...options, tracking });
}

export function renderBlocksToText(
  blocks: EmailBlock[],
  tracking: TrackingContext = null,
  options: Omit<RenderOptions, "tracking"> = {}
): string {
  return renderEmailText(blocks, { ...options, tracking });
}

export type { EmailTheme };

let blockIdCounter = 0;
export function newBlockId() {
  blockIdCounter += 1;
  return `blk_${Date.now()}_${blockIdCounter}`;
}

/** A sensible starting block for each type, used by "Add block" in the editor. */
export function createDefaultBlock(type: EmailBlockType): EmailBlock {
  const id = newBlockId();
  switch (type) {
    case "heading":
      return { id, type, text: "Your headline here" };
    case "text":
      return { id, type, html: "<p>Write your message here.</p>" };
    case "image":
      return { id, type, url: art("photo"), alt: "Image" };
    case "button":
      return { id, type, label: "Shop now", url: "https://example.com" };
    case "divider":
      return { id, type };
    case "spacer":
      return { id, type, height: 24 };
    case "footer":
      return { id, type, text: "You're receiving this email because you subscribed to our updates.\n{{business_name}}" };
    case "header":
      return { id, type, brand: "Your brand", links: [{ label: "Shop", url: "https://example.com" }, { label: "About", url: "https://example.com/about" }] };
    case "hero":
      return { id, type, eyebrow: "New", headline: "A headline that [[stands out]]", text: "Tell people what this email is about in a sentence or two.", imageUrl: art("photo"), imageAlt: "", imagePosition: "bottom", buttonLabel: "Shop now", buttonUrl: "https://example.com", align: "center", bg: "@primary" };
    case "coupon":
      return { id, type, eyebrow: "Just for you", headline: "15% off", text: "Use this code at checkout.", code: "SAVE15", buttonLabel: "Shop now", buttonUrl: "https://example.com", bg: "@primarySoft", color: "@text", accent: "@primary" };
    case "cards":
      return {
        id, type, heading: "Our favourites", columns: 2, boxed: true,
        items: [
          { imageUrl: art("bottle"), title: "Product one", text: "A short description.", price: "$24", buttonLabel: "Shop now", buttonUrl: "https://example.com" },
          { imageUrl: art("box"), title: "Product two", text: "A short description.", price: "$32", buttonLabel: "Shop now", buttonUrl: "https://example.com" },
        ],
        bg: "@primarySoft", color: "@text", accent: "@primary", cardBg: "@surface",
      };
    case "list":
      return {
        id, type, heading: "Why you'll love it", style: "icons", boxed: false,
        items: [
          { icon: "leaf", title: "Natural ingredients", text: "Made with care." },
          { icon: "truck", title: "Fast delivery", text: "At your door in days." },
          { icon: "shield", title: "30-day guarantee", text: "Love it or send it back." },
        ],
        bg: "@surface", color: "@text", accent: "@primary",
      };
    case "testimonials":
      return {
        id, type, heading: "What people say",
        items: [{ quote: "This is exactly what I was looking for. Highly recommend.", name: "Alex M.", role: "Verified customer", rating: 5 }],
        bg: "@surface", color: "@text", accent: "@primary", boxed: false,
      };
    case "split":
      return { id, type, imageUrl: art("photo"), imageAlt: "", imageSide: "left", eyebrow: "Our story", headline: "Made for you", text: "Share what makes your product special.", buttonLabel: "Learn more", buttonUrl: "https://example.com", bg: "@surface", color: "@text", accent: "@primary" };
    case "callout":
      return { id, type, icon: "sparkles", headline: "Built to help you succeed", text: "A short supporting line goes here.", buttonLabel: "Get started", buttonUrl: "https://example.com", bg: "@secondary", sectionBg: "@surface" };
    case "wave":
      return { id, type, shape: "wave", top: "@surface", bottom: "@primary", height: 56 };
    case "social":
      return { id, type, links: [{ network: "instagram", url: "https://instagram.com" }, { network: "facebook", url: "https://facebook.com" }, { network: "x", url: "https://x.com" }], bg: "@surface", iconBg: "@primary" };
    case "links":
      return { id, type, links: [{ label: "Shop all", url: "https://example.com" }, { label: "About us", url: "https://example.com/about" }, { label: "Contact", url: "https://example.com/contact" }], style: "inline", bg: "@surface" };
  }
}
