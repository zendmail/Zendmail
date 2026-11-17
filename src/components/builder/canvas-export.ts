import type { CanvasItem, EmailTheme } from "@/db/schema";
import { CANVAS_WIDTH, canvasFont, canvasFontSize } from "@/lib/email-builder/canvas";
import { resolveImageUrl } from "@/lib/email-builder/assets";
import { contrastOn, resolveColor } from "@/lib/email-builder/theme";

const SCALE = 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("An image in this design couldn't be loaded."));
    img.src = src;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

function drawText(ctx: CanvasRenderingContext2D, item: CanvasItem, color: string, centerVertically: boolean) {
  const size = canvasFontSize(item);
  ctx.font = `${item.weight === "bold" ? 700 : 400} ${size}px ${canvasFont(item)}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  const pad = item.kind === "button" ? 12 : 0;
  const maxWidth = Math.max(10, item.w - pad * 2);
  const lines = wrap(ctx, item.text ?? "", maxWidth);
  const lineHeight = size * 1.25;
  const block = lines.length * lineHeight;
  let y = item.y + (centerVertically ? (item.h - block) / 2 : 0);
  const align = item.align ?? (item.kind === "button" ? "center" : "left");
  for (const line of lines) {
    const width = ctx.measureText(line).width;
    const x = align === "center" ? item.x + (item.w - width) / 2 : align === "right" ? item.x + item.w - pad - width : item.x + pad;
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
}

/** Draws the design into a PNG exactly as the live view shows it (used as the picture inside emails). */
export async function exportCanvasBlob(opts: { items: CanvasItem[]; height: number; bg: string; theme: EmailTheme }): Promise<{ blob: Blob; type: "image/png" | "image/jpeg" }> {
  const { items, height, theme } = opts;
  const bg = resolveColor(opts.bg, theme, "#FFFFFF");
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH * SCALE;
  canvas.height = Math.round(height * SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't render the design.");
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, height);

  for (const item of items) {
    const fill = resolveColor(item.bg, theme, theme.primary);
    ctx.save();
    if (item.kind === "shape") {
      ctx.fillStyle = fill;
      roundedRect(ctx, item.x, item.y, item.w, item.h, item.radius ?? 0);
      ctx.fill();
    } else if (item.kind === "image" && item.imageUrl) {
      const img = await loadImage(resolveImageUrl(item.imageUrl, theme));
      roundedRect(ctx, item.x, item.y, item.w, item.h, item.radius ?? 0);
      ctx.clip();
      const k = Math.max(item.w / img.naturalWidth, item.h / img.naturalHeight);
      const sw = item.w / k, sh = item.h / k;
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, item.x, item.y, item.w, item.h);
    } else if (item.kind === "button") {
      ctx.fillStyle = fill;
      roundedRect(ctx, item.x, item.y, item.w, item.h, item.radius ?? 8);
      ctx.fill();
      drawText(ctx, item, resolveColor(item.color, theme, contrastOn(fill)), true);
    } else if (item.kind === "text") {
      drawText(ctx, item, resolveColor(item.color, theme, contrastOn(bg)), false);
    }
    ctx.restore();
  }

  const toBlob = (type: string, q?: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  let blob = await toBlob("image/png");
  if (blob && blob.size <= 3.6 * 1024 * 1024) return { blob, type: "image/png" };
  blob = await toBlob("image/jpeg", 0.9);
  if (!blob) throw new Error("Couldn't create the design picture.");
  return { blob, type: "image/jpeg" };
}
