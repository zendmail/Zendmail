import type { EmailTheme } from "@/db/schema";
import { isToken, normalizeHex, resolveColor } from "./theme";

/**
 * Images in templates can be real URLs (https://…, uploaded photos) or "asset:" references to
 * pictures the app draws on demand in the workspace's brand colours:
 *
 *   asset:art?name=bottle&c1=@primary&c2=@secondary&c3=@accent
 *
 * Colours may be tokens (@primary…) — they're resolved against the email's theme when rendered, so
 * template artwork follows the user's brand colours until they replace it with their own photo.
 */

export const ART_NAMES = [
  "bottle", "jar", "box", "tube", "water", "phone", "laptop", "photo", "people", "food", "gummies", "basket",
] as const;
export type ArtName = (typeof ART_NAMES)[number];

/** Natural aspect ratio (w/h) of each illustration, so layouts reserve the right space. */
export const ART_RATIO: Record<ArtName, number> = {
  bottle: 400 / 440, jar: 1, box: 1, tube: 400 / 440, water: 400 / 460, phone: 400 / 480, laptop: 600 / 400,
  photo: 600 / 400, people: 600 / 400, food: 600 / 300, gummies: 500 / 300, basket: 500 / 400,
};

const ASSET_PREFIX = "asset:";

export function isAssetRef(url: string | undefined | null): url is string {
  return typeof url === "string" && url.startsWith(ASSET_PREFIX);
}

/** Builds an `asset:art?…` reference for template data. */
export function art(name: ArtName, colors: { c1?: string; c2?: string; c3?: string } = {}) {
  const { c1 = "@primary", c2 = "@secondary", c3 = "@accent" } = colors;
  return `${ASSET_PREFIX}art?name=${name}&c1=${c1}&c2=${c2}&c3=${c3}`;
}

function resolveParam(value: string, theme: EmailTheme) {
  if (isToken(value) || value.startsWith("#")) return resolveColor(value, theme, "#888888").slice(1);
  return normalizeHex(`#${value}`)?.slice(1) ?? "888888";
}

/**
 * Turns anything an image block may hold into a URL safe to put in an <img src>:
 *  - "asset:…"            -> "/api/email-assets/…" (colours resolved from the theme)
 *  - "https://…"          -> unchanged
 *  - "/relative/path.png" -> unchanged
 *  - anything else (javascript:, data:, http:, garbage) -> "" (callers skip the image)
 */
export function resolveImageUrl(url: string | undefined | null, theme: EmailTheme): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (isAssetRef(trimmed)) {
    const [kind, query = ""] = trimmed.slice(ASSET_PREFIX.length).split("?");
    const params = new URLSearchParams(query);
    const out = new URLSearchParams();
    for (const [key, value] of params) {
      out.set(key, /^(c[0-9]|bg|fg|top|bottom|color)$/.test(key) ? resolveParam(value, theme) : value);
    }
    return `/api/email-assets/${kind}?${out.toString()}`;
  }
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^\/(?!\/)/.test(trimmed)) return trimmed;
  return "";
}

const strip = (hex: string) => hex.replace("#", "");

export function iconAssetUrl(name: string, bg: string, fg: string, size = 44, shape: "circle" | "rounded" | "none" = "circle") {
  return `/api/email-assets/icon?name=${encodeURIComponent(name)}&bg=${strip(bg)}&fg=${strip(fg)}&size=${size}&shape=${shape}`;
}

export function badgeAssetUrl(text: string, bg: string, fg: string, size = 40) {
  return `/api/email-assets/badge?text=${encodeURIComponent(text.slice(0, 2))}&bg=${strip(bg)}&fg=${strip(fg)}&size=${size}`;
}

export function waveAssetUrl(shape: string, top: string, bottom: string, height: number) {
  return `/api/email-assets/wave?shape=${shape}&top=${strip(top)}&bottom=${strip(bottom)}&height=${height}`;
}
