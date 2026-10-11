import { ImageResponse } from "next/og";
import { ICON_NODES, type IconNode } from "@/lib/email-builder/icon-data";
import { ART_NAMES, ART_RATIO, type ArtName } from "@/lib/email-builder/assets";
import { artSvg } from "@/lib/email-builder/illustrations";
import { WAVE_SHAPES, wavePath, type WaveShape } from "@/lib/email-builder/waves";

/**
 * Public, cacheable PNGs used inside emails: icons, number/initial badges, section dividers and
 * product/people illustrations — all drawn on demand in the requested brand colours (email clients
 * can't render SVG, so these must be real images). Every parameter is validated; nothing user-provided
 * is ever interpolated into the output except whitelisted names and 6-digit hex colours.
 */

export const runtime = "nodejs";

const HEX6 = /^[0-9a-f]{6}$/i;
const HEADERS = { "Cache-Control": "public, max-age=31536000, immutable" };

const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

function colorParam(sp: URLSearchParams, key: string, fallback: string) {
  const v = sp.get(key);
  return v && HEX6.test(v) ? `#${v.toUpperCase()}` : fallback;
}

function intParam(sp: URLSearchParams, key: string, fallback: number, min: number, max: number) {
  const n = Number(sp.get(key));
  return Number.isFinite(n) && sp.get(key) !== null ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}

// Brand glyphs aren't in the icon set, so they're drawn here (24x24 box).
const BRAND: Record<string, (fg: string) => string> = {
  facebook: (fg) => `<path d="M14.2 8.2h2.3V4.6h-2.9c-2.7 0-4.1 1.7-4.1 4.2v1.8H7.2v3.5h2.3V21h3.6v-6.9h2.6l.5-3.5h-3.1V9.2c0-.7.3-1 1.1-1z" fill="${fg}"/>`,
  instagram: (fg) => `<rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="${fg}" stroke-width="2"/><circle cx="12" cy="12" r="3.7" fill="none" stroke="${fg}" stroke-width="2"/><circle cx="16.9" cy="7.1" r="1.2" fill="${fg}"/>`,
  youtube: (fg) => `<rect x="3" y="6" width="18" height="12" rx="4" fill="none" stroke="${fg}" stroke-width="2"/><path d="M10.2 9.6v4.8l4.2-2.4z" fill="${fg}"/>`,
  linkedin: (fg) => `<rect x="4.4" y="9.4" width="3.2" height="10" fill="${fg}"/><circle cx="6" cy="5.9" r="1.9" fill="${fg}"/><path d="M10.2 9.4h3v1.4c.5-.9 1.6-1.6 3.1-1.6 2.6 0 3.4 1.6 3.4 4v6.2h-3.2v-5.4c0-1.2-.3-2-1.5-2-1.3 0-1.8.9-1.8 2.1v5.3h-3z" fill="${fg}"/>`,
};
const BRAND_ALIAS: Record<string, string> = { tiktok: "music" };

function glyphSvg(name: string, fg: string): string | null {
  const brand = BRAND[name];
  if (brand) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${brand(fg)}</svg>`;
  const nodes: IconNode | undefined = ICON_NODES[BRAND_ALIAS[name] ?? name];
  if (!nodes) return null;
  const inner = nodes
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${String(v).replace(/"/g, "")}"`).join(" ")}/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

function png(element: React.ReactElement, width: number, height: number) {
  return new ImageResponse(element, { width, height, headers: HEADERS });
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const sp = new URL(request.url).searchParams;

  if (kind === "icon") {
    const name = sp.get("name") ?? "";
    const size = intParam(sp, "size", 44, 16, 160);
    const px = size * 2;
    const fg = colorParam(sp, "fg", "#FFFFFF");
    const bg = colorParam(sp, "bg", "#0B5FFF");
    const shape = sp.get("shape") === "rounded" ? "rounded" : sp.get("shape") === "none" ? "none" : "circle";
    const glyph = glyphSvg(name, fg);
    if (!glyph) return new Response("Unknown icon", { status: 400 });
    const inner = shape === "none" ? px : Math.round(px * 0.5);
    return png(
      <div style={{ width: px, height: px, display: "flex", alignItems: "center", justifyContent: "center", background: shape === "none" ? "transparent" : bg, borderRadius: shape === "circle" ? px / 2 : shape === "rounded" ? px * 0.28 : 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri(glyph)} width={inner} height={inner} alt="" />
      </div>,
      px,
      px
    );
  }

  if (kind === "badge") {
    const text = (sp.get("text") ?? "").replace(/[^\p{L}\p{N}+%$€£]/gu, "").slice(0, 2) || "•";
    const size = intParam(sp, "size", 40, 16, 120);
    const px = size * 2;
    return png(
      <div style={{ width: px, height: px, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: px / 2, background: colorParam(sp, "bg", "#0B5FFF"), color: colorParam(sp, "fg", "#FFFFFF"), fontSize: Math.round(px * 0.46), fontWeight: 700 }}>
        {text}
      </div>,
      px,
      px
    );
  }

  if (kind === "wave") {
    const shape = sp.get("shape") as WaveShape;
    if (!(WAVE_SHAPES as readonly string[]).includes(shape)) return new Response("Unknown shape", { status: 400 });
    const height = intParam(sp, "height", 48, 12, 140);
    const top = colorParam(sp, "top", "#FFFFFF");
    const bottom = colorParam(sp, "bottom", "#0B5FFF");
    const w = 1200;
    const h = height * 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 100" preserveAspectRatio="none" width="${w}" height="${h}"><rect width="1200" height="100" fill="${bottom}"/><path d="${wavePath(shape)}" fill="${top}"/></svg>`;
    return png(
      // eslint-disable-next-line @next/next/no-img-element
      <img src={dataUri(svg)} width={w} height={h} alt="" />,
      w,
      h
    );
  }

  if (kind === "art") {
    const name = sp.get("name") as ArtName;
    if (!(ART_NAMES as readonly string[]).includes(name)) return new Response("Unknown art", { status: 400 });
    const width = intParam(sp, "w", 600, 120, 1200);
    const height = Math.round(width / ART_RATIO[name]);
    const svg = artSvg(name, {
      c1: colorParam(sp, "c1", "#0B5FFF"),
      c2: colorParam(sp, "c2", "#0B1A3D"),
      c3: colorParam(sp, "c3", "#10B981"),
    });
    return png(
      // eslint-disable-next-line @next/next/no-img-element
      <img src={dataUri(svg.replace(/width="\d+" height="\d+"/, `width="${width}" height="${height}"`))} width={width} height={height} alt="" />,
      width,
      height
    );
  }

  return new Response("Not found", { status: 404 });
}
