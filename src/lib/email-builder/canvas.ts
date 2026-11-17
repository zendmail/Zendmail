import type { CanvasItem } from "@/db/schema";

/** The "Free layout" block lives in a fixed 600px-wide design space; everything scales from it. */
export const CANVAS_WIDTH = 600;

export const CANVAS_FONTS: Record<NonNullable<CanvasItem["font"]>, string> = {
  sans: `Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`,
  serif: `Georgia, "Times New Roman", Times, serif`,
  mono: `"SF Mono", Menlo, Consolas, "Courier New", monospace`,
};

export const canvasFont = (item: CanvasItem) => CANVAS_FONTS[item.font ?? "sans"];
export const canvasFontSize = (item: CanvasItem) => item.fontSize ?? (item.kind === "button" ? 16 : 20);

/** Elements that carry readable text, top to bottom (alt text, plain-text version, stacked fallback). */
export function canvasTextItems(items: CanvasItem[]): CanvasItem[] {
  return items.filter((i) => (i.kind === "text" || i.kind === "button") && i.text?.trim()).sort((a, b) => a.y - b.y || a.x - b.x);
}
