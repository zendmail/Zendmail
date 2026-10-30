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

// Brand glyphs aren't in the icon set. Facebook, Instagram, X, TikTok and YouTube use the official marks' outlines from
// Simple Icons (CC0, 24x24 box); the glyph is recoloured to match the email theme. LinkedIn's mark is no longer distributed
// there, so it stays a hand-drawn "in" glyph.
const BRAND: Record<string, (fg: string) => string> = {
  facebook: (fg) => `<path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" fill="${fg}"/>`,
  instagram: (fg) => `<path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" fill="${fg}"/>`,
  x: (fg) => `<path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" fill="${fg}"/>`,
  tiktok: (fg) => `<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="${fg}"/>`,
  youtube: (fg) => `<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="${fg}"/>`,
  linkedin: (fg) => `<rect x="4.4" y="9.4" width="3.2" height="10" fill="${fg}"/><circle cx="6" cy="5.9" r="1.9" fill="${fg}"/><path d="M10.2 9.4h3v1.4c.5-.9 1.6-1.6 3.1-1.6 2.6 0 3.4 1.6 3.4 4v6.2h-3.2v-5.4c0-1.2-.3-2-1.5-2-1.3 0-1.8.9-1.8 2.1v5.3h-3z" fill="${fg}"/>`,
};

function glyphSvg(name: string, fg: string): string | null {
  const brand = BRAND[name];
  if (brand) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${brand(fg)}</svg>`;
  const nodes: IconNode | undefined = ICON_NODES[name];
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
