import type { EmailBlock } from "@/db/schema";
import { appUrl } from "./app-url";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeEmailColor(color: string | undefined, fallback: string) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export type TrackingContext = { recipientId: string } | null;

function trackClick(url: string, tracking: TrackingContext) {
  if (!tracking) return url;
  return appUrl(`/api/t/click/${tracking.recipientId}?url=${encodeURIComponent(url)}`);
}

/**
 * Renders the block array to a self-contained HTML email body. Kept as
 * table-free, inline-styled divs for now — real ESP-safe markup (nested
 * tables, mso conditionals) is a V2 concern once we're sending through a
 * real provider rather than the console stub.
 *
 * When `tracking` is provided, an open pixel is injected and every link
 * (button, unsubscribe) is rewritten through the click-tracking redirect
 * so opens/clicks can be attributed back to a specific recipient.
 */
export function renderBlocksToHtml(blocks: EmailBlock[], tracking: TrackingContext = null): string {
  const body = blocks.map((b) => renderBlock(b, tracking)).join("\n");
  const pixel = tracking
    ? `<img src="${appUrl(`/api/t/open/${tracking.recipientId}`)}" width="1" height="1" alt="" style="display:none;" />`
    : "";
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#F1F3F6;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
${body}
</div>
${pixel}
</body></html>`;
}

function renderBlock(block: EmailBlock, tracking: TrackingContext): string {
  switch (block.type) {
    case "heading":
      return `<h1 style="margin:0;padding:20px 24px 0;font-size:22px;color:${safeEmailColor(block.color, "#10151C")};">${escapeHtml(block.text)}</h1>`;
    case "text":
      return `<div style="padding:12px 24px;font-size:14px;line-height:1.6;color:${safeEmailColor(block.color, "#10151C")};">${block.html}</div>`;
    case "image":
      return `<img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" style="width:100%;display:block;" />`;
    case "button": {
      const href = tracking ? trackClick(block.url, tracking) : block.url;
      return `<div style="padding:16px 24px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${safeEmailColor(block.backgroundColor, "#4F46E5")};color:${safeEmailColor(block.textColor, "#FFFFFF")};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;">${escapeHtml(block.label)}</a></div>`;
    }
    case "divider":
      return `<hr style="border:none;border-top:1px solid #E3E7ED;margin:16px 24px;" />`;
    case "spacer":
      return `<div style="height:${block.height}px;"></div>`;
    case "footer": {
      const unsubUrl = tracking ? appUrl(`/api/t/unsubscribe/${tracking.recipientId}`) : "{{unsubscribe_url}}";
      const footerColor = safeEmailColor(block.color, "#8890A0");
      return `<div style="padding:20px 24px;font-size:12px;color:${footerColor};border-top:1px solid #E3E7ED;">${escapeHtml(block.text)}<br/><a href="${unsubUrl}" style="color:${footerColor};">Unsubscribe</a></div>`;
    }
    default:
      return "";
  }
}

export function renderBlocksToText(blocks: EmailBlock[], tracking: TrackingContext = null): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `${block.text}\n${"=".repeat(block.text.length)}`;
        case "text":
          return block.html.replace(/<[^>]+>/g, "");
        case "image":
          return `[image: ${block.alt || block.url}]`;
        case "button":
          return `${block.label}: ${block.url}`;
        case "divider":
          return "----------";
        case "spacer":
          return "";
        case "footer":
          return `${block.text}\nUnsubscribe: ${tracking ? appUrl(`/api/t/unsubscribe/${tracking.recipientId}`) : "{{unsubscribe_url}}"}`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

let blockIdCounter = 0;
export function newBlockId() {
  blockIdCounter += 1;
  return `blk_${Date.now()}_${blockIdCounter}`;
}

export function createDefaultBlock(type: EmailBlock["type"]): EmailBlock {
  const id = newBlockId();
  switch (type) {
    case "heading":
      return { id, type, text: "Your headline here" };
    case "text":
      return { id, type, html: "<p>Write your message here.</p>" };
    case "image":
      return { id, type, url: "https://placehold.co/560x240", alt: "Image" };
    case "button":
      return { id, type, label: "Shop now", url: "https://example.com" };
    case "divider":
      return { id, type };
    case "spacer":
      return { id, type, height: 24 };
    case "footer":
      return { id, type, text: "You're receiving this email because you subscribed to our updates." };
  }
}
