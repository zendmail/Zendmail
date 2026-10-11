import type { EmailFontKey, EmailTheme } from "@/db/schema";

/**
 * Theme engine for the email builder. Pure functions only (no server-only / DB imports) so it
 * can run in the renderer, server actions and client editor alike.
 *
 * Blocks store colours either as "#RRGGBB" or as a token ("@primary", "@accentSoft", …).
 * Tokens are resolved against the email's theme at render time, which is what lets a user
 * re-colour a whole template by changing five colours.
 */

export const DEFAULT_THEME: EmailTheme = {
  primary: "#0B5FFF",
  secondary: "#0B1A3D",
  accent: "#10B981",
  bg: "#F1F4F9",
  surface: "#FFFFFF",
  text: "#0B1A3D",
  muted: "#5B6B86",
  headingFont: "sans",
  bodyFont: "sans",
  button: "rounded",
};

export const FONT_OPTIONS: { key: EmailFontKey; label: string; stack: string; google?: string }[] = [
  { key: "sans", label: "Clean sans (Helvetica / Arial)", stack: "'Helvetica Neue',Helvetica,Arial,sans-serif" },
  { key: "modern", label: "Modern (Poppins)", stack: "'Poppins','Segoe UI',Helvetica,Arial,sans-serif", google: "Poppins:wght@400;500;600;700" },
  { key: "rounded", label: "Friendly (Nunito)", stack: "'Nunito','Trebuchet MS',Verdana,sans-serif", google: "Nunito:wght@400;600;700;800" },
  { key: "serif", label: "Classic serif (Georgia)", stack: "Georgia,'Times New Roman',Times,serif" },
  { key: "editorial", label: "Editorial (Playfair Display)", stack: "'Playfair Display',Georgia,'Times New Roman',serif", google: "Playfair+Display:wght@500;700" },
  { key: "display", label: "Bold display (Montserrat)", stack: "'Montserrat','Arial Black',Arial,sans-serif", google: "Montserrat:wght@500;700;800" },
];

export function fontStack(key: EmailFontKey) {
  return (FONT_OPTIONS.find((f) => f.key === key) ?? FONT_OPTIONS[0]).stack;
}

/** Google-fonts stylesheet URL for the theme's fonts, or null when only system fonts are used. */
export function googleFontsHref(theme: EmailTheme): string | null {
  const families = new Set<string>();
  for (const key of [theme.headingFont, theme.bodyFont]) {
    const google = FONT_OPTIONS.find((f) => f.key === key)?.google;
    if (google) families.add(google);
  }
  if (families.size === 0) return null;
  return `https://fonts.googleapis.com/css2?${[...families].map((f) => `family=${f}`).join("&")}&display=swap`;
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!HEX.test(v)) return null;
  if (v.length === 4) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toUpperCase();
  return v.toUpperCase();
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Linear mix of two hex colours; t=0 -> a, t=1 -> b. */
export function mix(a: string, b: string, t: number) {
  const ra = toRgb(a);
  const rb = toRgb(b);
  return toHex([ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t]);
}

function luminance(hex: string) {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Readable text colour (near-white or near-black) for content placed on `background`. */
export function contrastOn(background: string) {
  return luminance(background) > 0.45 ? "#0B1220" : "#FFFFFF";
}

export const COLOR_TOKENS = [
  "primary", "secondary", "accent", "bg", "surface", "text", "muted",
  "primarySoft", "secondarySoft", "accentSoft",
  "onPrimary", "onSecondary", "onAccent",
] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

export const TOKEN_LABELS: Record<ColorToken, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  bg: "Page background",
  surface: "Email background",
  text: "Text",
  muted: "Muted text",
  primarySoft: "Primary (soft tint)",
  secondarySoft: "Secondary (soft tint)",
  accentSoft: "Accent (soft tint)",
  onPrimary: "Text on primary",
  onSecondary: "Text on secondary",
  onAccent: "Text on accent",
};

export function resolveToken(token: ColorToken, theme: EmailTheme): string {
  switch (token) {
    case "primarySoft": return mix(theme.primary, "#FFFFFF", 0.88);
    case "secondarySoft": return mix(theme.secondary, "#FFFFFF", 0.9);
    case "accentSoft": return mix(theme.accent, "#FFFFFF", 0.86);
    case "onPrimary": return contrastOn(theme.primary);
    case "onSecondary": return contrastOn(theme.secondary);
    case "onAccent": return contrastOn(theme.accent);
    default: return theme[token];
  }
}

export function isToken(value: string): value is `@${ColorToken}` {
  return value.startsWith("@") && (COLOR_TOKENS as readonly string[]).includes(value.slice(1));
}

/** Accepts "#RRGGBB", "#RGB" or "@token"; anything else yields the fallback. */
export function resolveColor(value: string | undefined | null, theme: EmailTheme, fallback: string): string {
  if (!value) return fallback;
  if (isToken(value)) return resolveToken(value.slice(1) as ColorToken, theme);
  return normalizeHex(value) ?? fallback;
}

export function isValidColorValue(value: unknown): value is string {
  return typeof value === "string" && (isToken(value) || normalizeHex(value) !== null);
}

// ---------------------------------------------------------------------------
// Validation / presets
// ---------------------------------------------------------------------------

const FONT_KEYS = FONT_OPTIONS.map((f) => f.key);
const BUTTONS = ["rounded", "pill", "square"] as const;

/** Sanitises untrusted theme JSON (DB rows, form input) into a complete, safe EmailTheme. */
export function parseTheme(input: unknown): EmailTheme {
  const t = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const color = (key: keyof EmailTheme) => normalizeHex(t[key]) ?? (DEFAULT_THEME[key] as string);
  return {
    primary: color("primary"),
    secondary: color("secondary"),
    accent: color("accent"),
    bg: color("bg"),
    surface: color("surface"),
    text: color("text"),
    muted: color("muted"),
    headingFont: FONT_KEYS.includes(t.headingFont as EmailFontKey) ? (t.headingFont as EmailFontKey) : DEFAULT_THEME.headingFont,
    bodyFont: FONT_KEYS.includes(t.bodyFont as EmailFontKey) ? (t.bodyFont as EmailFontKey) : DEFAULT_THEME.bodyFont,
    button: (BUTTONS as readonly string[]).includes(t.button as string) ? (t.button as EmailTheme["button"]) : DEFAULT_THEME.button,
  };
}

export const THEME_PRESETS: { name: string; theme: EmailTheme }[] = [
  { name: "Ocean", theme: { ...DEFAULT_THEME, primary: "#0B5FFF", secondary: "#0B1A3D", accent: "#10B981" } },
  { name: "Forest", theme: { ...DEFAULT_THEME, primary: "#0F8B6D", secondary: "#10302A", accent: "#F59E0B", bg: "#EEF5F2", text: "#10302A", muted: "#4F6B63" } },
  { name: "Berry", theme: { ...DEFAULT_THEME, primary: "#C026D3", secondary: "#3B0A45", accent: "#F472B6", bg: "#FBEFFB", text: "#3B0A45", muted: "#7A4E85" } },
  { name: "Sunset", theme: { ...DEFAULT_THEME, primary: "#EA580C", secondary: "#3B1D0F", accent: "#FACC15", bg: "#FFF4EA", text: "#3B1D0F", muted: "#7A5A45" } },
  { name: "Lavender", theme: { ...DEFAULT_THEME, primary: "#6D5BD0", secondary: "#2A2350", accent: "#F7B267", bg: "#EEEAFB", text: "#2A2350", muted: "#625C8C" } },
  { name: "Slate", theme: { ...DEFAULT_THEME, primary: "#111827", secondary: "#111827", accent: "#2563EB", bg: "#EEF0F3", text: "#111827", muted: "#5B6472" } },
];
