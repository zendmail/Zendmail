import type { EmailBlock, EmailCardItem, EmailTheme } from "@/db/schema";
import { appUrl } from "../app-url";
import { applyMergeTags, SAMPLE_VARS, type MergeVars } from "./merge";
import { badgeAssetUrl, iconAssetUrl, resolveImageUrl, waveAssetUrl } from "./assets";
import { contrastOn, DEFAULT_THEME, fontStack, googleFontsHref, mix, parseTheme, resolveColor } from "./theme";

/**
 * Email renderer. Produces table-based, inline-styled HTML that survives Gmail, Outlook and Apple
 * Mail, with a small <style> block that stacks columns on phones. All user text is escaped.
 */

export type TrackingContext = { recipientId: string } | null;

export type RenderOptions = {
  theme?: EmailTheme | null;
  tracking?: TrackingContext;
  /** Merge-tag values. Omit for a preview (sample data is used). */
  vars?: MergeVars;
  /** Inbox preview line shown next to the subject. */
  preheader?: string | null;
  /** Physical postal address printed under the content (required in marketing email by CAN-SPAM, GDPR/ePrivacy rules and most mailbox providers). */
  postalAddress?: string | null;
};

const WIDTH = 600;
const PAD = 32;

function esc(input: string) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text -> safe inline HTML: **bold**, [[accent colour]], and line breaks. */
function rich(input: string | undefined, accent: string) {
  return esc(input ?? "")
    .replace(/\[\[(.+?)\]\]/g, `<span style="color:${accent};">$1</span>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\r?\n/g, "<br/>");
}

function safeUrl(url: string | undefined) {
  const v = (url ?? "").trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(v) || /^\{\{\s*unsubscribe_url\s*\}\}$/i.test(v) || v === "#") return v;
  return "#";
}

type Ctx = {
  theme: EmailTheme;
  tracking: TrackingContext;
  head: string;
  body: string;
  color: (value: string | undefined, fallback: string) => string;
  link: (url: string | undefined) => string;
  img: (url: string | undefined) => string;
};

function makeCtx(theme: EmailTheme, tracking: TrackingContext): Ctx {
  return {
    theme,
    tracking,
    head: fontStack(theme.headingFont),
    body: fontStack(theme.bodyFont),
    color: (value, fallback) => resolveColor(value, theme, fallback),
    link: (url) => {
      const safe = safeUrl(url);
      if (!tracking || safe === "#" || !/^https?:/i.test(safe) || /^\{\{/.test(safe)) return safe;
      return appUrl(`/api/t/click/${tracking.recipientId}?url=${encodeURIComponent(safe)}`);
    },
    img: (url) => {
      const resolved = resolveImageUrl(url, theme);
      return resolved.startsWith("/") ? appUrl(resolved) : resolved;
    },
  };
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function section(bg: string, inner: string, opts: { top?: number; bottom?: number; x?: number; align?: "left" | "center" } = {}) {
  const { top = 36, bottom = 36, x = PAD, align = "left" } = opts;
  return `<tr><td class="px" align="${align}" bgcolor="${bg}" style="background-color:${bg};padding:${top}px ${x}px ${bottom}px ${x}px;text-align:${align};">${inner}</td></tr>`;
}

function buttonRadius(theme: EmailTheme) {
  return theme.button === "pill" ? 999 : theme.button === "square" ? 2 : 10;
}

function button(c: Ctx, label: string, url: string | undefined, bg: string, fg: string, align: "left" | "center" = "left", small = false) {
  const r = buttonRadius(c.theme);
  const pad = small ? "10px 20px" : "15px 32px";
  const size = small ? 13 : 15;
  const cell = `<td align="center" bgcolor="${bg}" style="background-color:${bg};border-radius:${r}px;"><a href="${esc(c.link(url))}" target="_blank" style="display:inline-block;padding:${pad};font-family:${c.body};font-size:${size}px;line-height:${size + 2}px;font-weight:700;color:${fg};text-decoration:none;border-radius:${r}px;">${esc(label)}</a></td>`;
  // Only centre via align+margin; a left "align" attribute would float the table and let following content wrap beside it.
  const position = align === "center" ? `align="center" style="margin:0 auto;"` : `style="margin:0;"`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${position}><tr>${cell}</tr></table>`;
}

function h2(c: Ctx, text: string, color: string, accent: string, align: "left" | "center" = "center") {
  return `<h2 class="h2" style="margin:0;padding:0;font-family:${c.head};font-size:28px;line-height:1.2;font-weight:800;color:${color};text-align:${align};">${rich(text, accent)}</h2>`;
}

function para(c: Ctx, text: string, color: string, size = 16, align: "left" | "center" = "left") {
  return `<p style="margin:0;padding:0;font-family:${c.body};font-size:${size}px;line-height:1.6;color:${color};text-align:${align};">${rich(text, color)}</p>`;
}

function image(c: Ctx, url: string | undefined, alt: string | undefined, opts: { maxWidth?: number; radius?: number; margin?: string } = {}) {
  const src = c.img(url);
  if (!src) return "";
  const { maxWidth = WIDTH - PAD * 2, radius = 0, margin = "0" } = opts;
  return `<img class="fluid" src="${esc(src)}" alt="${esc(alt ?? "")}" width="${maxWidth}" style="display:block;width:100%;max-width:${maxWidth}px;height:auto;border:0;outline:none;text-decoration:none;border-radius:${radius}px;margin:${margin};" />`;
}

function icon(c: Ctx, name: string, bg: string, fg: string, size = 44, shape: "circle" | "rounded" | "none" = "circle") {
  return `<img src="${esc(appUrl(iconAssetUrl(name, bg, fg, size, shape)))}" alt="" width="${size}" height="${size}" style="display:block;border:0;width:${size}px;height:${size}px;" />`;
}

function stars(rating: number | undefined) {
  const n = Math.max(0, Math.min(5, Math.round(rating ?? 5)));
  return `<span style="color:#F5A623;letter-spacing:2px;">${"★".repeat(n)}</span><span style="color:#D6DBE4;letter-spacing:2px;">${"★".repeat(5 - n)}</span>`;
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

function renderBlock(block: EmailBlock, c: Ctx): string {
  const t = c.theme;
  const surface = t.surface;

  switch (block.type) {
    // ----- basic blocks -----------------------------------------------------
    case "heading": {
      const color = c.color(block.color, t.text);
      return section(surface, `<h1 class="h1" style="margin:0;font-family:${c.head};font-size:28px;line-height:1.2;font-weight:800;color:${color};">${rich(block.text, t.primary)}</h1>`, { top: 28, bottom: 8 });
    }
    case "text": {
      const color = c.color(block.color, t.text);
      return section(surface, `<div style="font-family:${c.body};font-size:16px;line-height:1.65;color:${color};">${block.html}</div>`, { top: 8, bottom: 8 });
    }
    case "image": {
      const src = c.img(block.url);
      return src ? `<tr><td style="padding:0;font-size:0;line-height:0;background-color:${surface};"><img class="fluid" src="${esc(src)}" alt="${esc(block.alt)}" width="${WIDTH}" style="display:block;width:100%;max-width:${WIDTH}px;height:auto;border:0;" /></td></tr>` : "";
    }
    case "button": {
      const bg = c.color(block.backgroundColor, t.primary);
      const fg = c.color(block.textColor, contrastOn(bg));
      return section(surface, button(c, block.label, block.url, bg, fg, "left"), { top: 14, bottom: 14 });
    }
    case "divider":
      return section(surface, `<div style="height:1px;line-height:1px;font-size:1px;border-top:1px solid ${mix(t.text, "#FFFFFF", 0.86)};">&nbsp;</div>`, { top: 12, bottom: 12 });
    case "spacer":
      return `<tr><td height="${Math.max(0, Math.min(200, block.height))}" style="height:${Math.max(0, Math.min(200, block.height))}px;line-height:1px;font-size:1px;background-color:${surface};">&nbsp;</td></tr>`;

    // ----- header / footer / links / social ----------------------------------
    case "header": {
      const bg = c.color(block.bg, surface);
      const color = c.color(block.color, contrastOn(bg));
      const logo = block.logoUrl ? c.img(block.logoUrl) : "";
      const brand = logo
        ? `<img src="${esc(logo)}" alt="${esc(block.brand)}" height="40" style="display:inline-block;height:40px;width:auto;border:0;" />`
        : `<span style="font-family:${c.head};font-size:26px;line-height:1;font-weight:800;letter-spacing:-0.02em;color:${color};">${esc(block.brand)}</span>`;
      const nav = block.links.length
        ? `<div style="padding-top:14px;font-family:${c.body};font-size:13px;font-weight:600;">${block.links.map((l) => `<a href="${esc(c.link(l.url))}" target="_blank" style="color:${mix(color, bg, 0.25)};text-decoration:none;padding:0 10px;">${esc(l.label)}</a>`).join("")}</div>`
        : "";
      return section(bg, brand + nav, { top: 24, bottom: 22, align: "center" });
    }
    case "links": {
      const bg = c.color(block.bg, surface);
      const color = c.color(block.color, contrastOn(bg));
      if (block.style === "pills") {
        const pills = block.links
          .map((l) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="60%" style="width:60%;margin:0 auto 10px;"><tr><td align="center" style="border:1.5px solid ${color};border-radius:999px;"><a href="${esc(c.link(l.url))}" target="_blank" style="display:block;padding:10px 16px;font-family:${c.body};font-size:14px;font-weight:600;color:${color};text-decoration:none;">${esc(l.label)}</a></td></tr></table>`)
          .join("");
        return section(bg, pills, { top: 24, bottom: 14, align: "center" });
      }
      return section(bg, `<div style="font-family:${c.body};font-size:14px;font-weight:600;">${block.links.map((l) => `<a href="${esc(c.link(l.url))}" target="_blank" style="color:${color};text-decoration:underline;padding:0 10px;">${esc(l.label)}</a>`).join("")}</div>`, { top: 18, bottom: 18, align: "center" });
    }
    case "social": {
      const bg = c.color(block.bg, surface);
      const iconBg = c.color(block.iconBg, bg === t.primary ? contrastOn(bg) : t.primary);
      const iconFg = contrastOn(iconBg);
      const cells = block.links
        .map((l) => `<td style="padding:0 6px;"><a href="${esc(c.link(l.url))}" target="_blank" style="text-decoration:none;">${icon(c, l.network, iconBg, iconFg, 36)}</a></td>`)
        .join("");
      return section(bg, `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>${cells}</tr></table>`, { top: 18, bottom: 18, align: "center" });
    }
    case "footer": {
      const bg = c.color(block.bg, surface);
      const color = c.color(block.color, mix(contrastOn(bg), bg, 0.38));
      const unsub = c.tracking ? appUrl(`/api/t/unsubscribe/${c.tracking.recipientId}`) : "{{unsubscribe_url}}";
      return section(
        bg,
        `<div style="font-family:${c.body};font-size:12px;line-height:1.6;color:${color};">${rich(block.text, color)}<br/><a href="${esc(unsub)}" style="color:${color};text-decoration:underline;">Unsubscribe</a></div>`,
        { top: 26, bottom: 30, align: "center" }
      );
    }

    // ----- hero --------------------------------------------------------------
    case "hero": {
      const bg = c.color(block.bg, t.primary);
      const color = c.color(block.color, contrastOn(bg));
      const accent = c.color(block.accent, color === "#FFFFFF" ? mix(t.accent, "#FFFFFF", 0.35) : t.primary);
      const align = block.align === "left" ? "left" : "center";
      const onDark = contrastOn(bg) === "#FFFFFF";
      const img = image(c, block.imageUrl, block.imageAlt, { maxWidth: align === "center" ? 480 : 536, margin: align === "center" ? "0 auto" : "0" });
      const top = block.imagePosition === "top" && img ? `<div style="padding-bottom:26px;">${img}</div>` : "";
      const bottom = block.imagePosition !== "top" && img ? `<div style="padding-top:30px;">${img}</div>` : "";
      const inner =
        top +
        (block.eyebrow ? `<div style="padding-bottom:14px;font-family:${c.body};font-size:12px;line-height:1.2;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${accent};">${esc(block.eyebrow)}</div>` : "") +
        `<h1 class="h1" style="margin:0;font-family:${c.head};font-size:38px;line-height:1.12;font-weight:800;letter-spacing:-0.015em;color:${color};">${rich(block.headline, accent)}</h1>` +
        (block.text ? `<div style="padding-top:16px;">${para(c, block.text, mix(color, bg, 0.14), 17, align)}</div>` : "") +
        (block.buttonLabel ? `<div style="padding-top:26px;">${button(c, block.buttonLabel, block.buttonUrl, onDark ? "#FFFFFF" : t.primary, onDark ? bg : contrastOn(t.primary), align)}</div>` : "") +
        bottom;
      return section(bg, inner, { top: 44, bottom: block.imagePosition === "top" ? 44 : 40, align });
    }

    // ----- coupon ------------------------------------------------------------
    case "coupon": {
      const bg = c.color(block.bg, t.primary);
      const color = c.color(block.color, contrastOn(bg));
      const accent = c.color(block.accent, color === "#FFFFFF" ? mix(t.accent, "#FFFFFF", 0.3) : t.primary);
      const onDark = contrastOn(bg) === "#FFFFFF";
      const btnBg = onDark ? "#FFFFFF" : t.primary;
      const btnFg = onDark ? bg : contrastOn(t.primary);
      const inner =
        (block.eyebrow ? `<div style="padding-bottom:10px;font-family:${c.body};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${mix(color, bg, 0.2)};">${esc(block.eyebrow)}</div>` : "") +
        `<div class="h1" style="font-family:${c.head};font-size:52px;line-height:1.05;font-weight:800;letter-spacing:-0.02em;color:${accent};">${rich(block.headline, accent)}</div>` +
        (block.text ? `<div style="padding-top:14px;">${para(c, block.text, mix(color, bg, 0.12), 16, "center")}</div>` : "") +
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:22px auto 0;"><tr><td align="center" style="border:2px dashed ${accent};border-radius:12px;padding:12px 26px;font-family:'Courier New',Courier,monospace;font-size:18px;line-height:1;font-weight:700;letter-spacing:0.14em;color:${color};">CODE: ${esc(block.code)}</td></tr></table>` +
        (block.buttonLabel ? `<div style="padding-top:22px;">${button(c, block.buttonLabel, block.buttonUrl, btnBg, btnFg, "center")}</div>` : "");
      return section(bg, inner, { top: 40, bottom: 40, align: "center" });
    }

    // ----- cards (products / features / articles) ----------------------------
    case "cards": {
      const bg = c.color(block.bg, surface);
      const color = c.color(block.color, contrastOn(bg));
      const accent = c.color(block.accent, t.primary);
      const cardBg = c.color(block.cardBg, block.boxed ? (bg === "#FFFFFF" ? "#FFFFFF" : surface) : bg);
      const cols = block.columns;
      const rows: EmailCardItem[][] = [];
      for (let i = 0; i < block.items.length; i += cols) rows.push(block.items.slice(i, i + cols));
      const pct = Math.floor(100 / cols);
      const cellPad = cols === 1 ? 0 : 6;
      const renderCard = (item: EmailCardItem) => {
        const img = item.imageUrl ? image(c, item.imageUrl, item.imageAlt ?? item.title, { maxWidth: cols === 1 ? 536 : cols === 2 ? 262 : 170, radius: block.boxed ? 0 : 14 }) : "";
        const textColor = block.boxed ? contrastOn(cardBg) : color;
        const lead = !item.imageUrl && item.icon ? `<div style="padding-bottom:12px;">${icon(c, item.icon, mix(accent, cardBg, 0.86), accent, 48, "rounded")}</div>` : "";
        const body =
          lead +
          (item.badge ? `<div style="padding-bottom:8px;"><span style="display:inline-block;background-color:${accent};color:${contrastOn(accent)};font-family:${c.body};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px;">${esc(item.badge)}</span></div>` : "") +
          `<div style="font-family:${c.head};font-size:${cols === 3 ? 15 : 17}px;line-height:1.3;font-weight:700;color:${textColor};">${rich(item.title, accent)}</div>` +
          (item.text ? `<div style="padding-top:6px;font-family:${c.body};font-size:${cols === 3 ? 13 : 14}px;line-height:1.55;color:${mix(textColor, cardBg, 0.2)};">${rich(item.text, accent)}</div>` : "") +
          (item.price ? `<div style="padding-top:8px;font-family:${c.head};font-size:16px;font-weight:800;color:${accent};">${esc(item.price)}</div>` : "") +
          (item.buttonLabel ? `<div style="padding-top:12px;">${button(c, item.buttonLabel, item.buttonUrl, accent, contrastOn(accent), cols === 1 ? "left" : "left", true)}</div>` : "");
        const inner = block.boxed
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${cardBg}" style="background-color:${cardBg};border:1px solid ${mix(contrastOn(cardBg) === "#FFFFFF" ? "#FFFFFF" : "#0B1220", cardBg, 0.84)};border-radius:16px;overflow:hidden;"><tr><td style="padding:0;font-size:0;line-height:0;">${img}</td></tr><tr><td style="padding:16px 16px 18px;">${body}</td></tr></table>`
          : `${img ? `<div style="padding-bottom:14px;">${img}</div>` : ""}<div>${body}</div>`;
        return inner;
      };
      const rowsHtml = rows
        .map((row) => {
          const cells = row
            .map((item) => `<td class="stack" width="${pct}%" valign="top" style="width:${pct}%;padding:0 ${cellPad}px 16px;">${renderCard(item)}</td>`)
            .join("");
          const fillers = cols - row.length;
          const empty = Array.from({ length: fillers }, () => `<td class="stack hide-m" width="${pct}%" style="width:${pct}%;"></td>`).join("");
          return `<tr>${cells}${empty}</tr>`;
        })
        .join("");
      const head =
        (block.heading ? `<div style="padding-bottom:${block.subheading ? 8 : 22}px;">${h2(c, block.heading, color, accent)}</div>` : "") +
        (block.subheading ? `<div style="padding:0 20px 22px;">${para(c, block.subheading, mix(color, bg, 0.25), 15, "center")}</div>` : "");
      return section(bg, `${head}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table>`, { top: 36, bottom: 20, x: PAD - cellPad });
    }

    // ----- list (features / steps / checklists) -------------------------------
    case "list": {
      const bg = c.color(block.bg, surface);
      const color = c.color(block.color, contrastOn(bg));
      const accent = c.color(block.accent, t.primary);
      const cardBg = c.color(block.cardBg, block.boxed ? (bg === "#FFFFFF" ? "#FFFFFF" : surface) : bg);
      const rowText = block.boxed ? contrastOn(cardBg) : color;
      const rows = block.items
        .map((item, i) => {
          let lead = "";
          if (block.style === "icons") lead = icon(c, item.icon ?? "sparkles", mix(accent, cardBg, 0.86), accent, 44, "rounded");
          else if (block.style === "checks") lead = icon(c, "check", accent, contrastOn(accent), 28);
          else if (block.style === "numbers") lead = `<img src="${esc(appUrl(badgeAssetUrl(String(i + 1), accent, contrastOn(accent), 34)))}" alt="${i + 1}" width="34" height="34" style="display:block;border:0;width:34px;height:34px;" />`;
          else lead = `<div style="font-family:${c.body};font-size:22px;line-height:22px;color:${accent};">•</div>`;
          const leadW = block.style === "icons" ? 44 : block.style === "numbers" ? 34 : 28;
          const row = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="${leadW + 14}" valign="top" style="width:${leadW + 14}px;padding-right:14px;">${lead}</td><td valign="middle" style="padding:${item.text ? 0 : 5}px 0 0;"><div style="font-family:${c.head};font-size:16px;line-height:1.35;font-weight:700;color:${rowText};">${rich(item.title, accent)}</div>${item.text ? `<div style="padding-top:3px;font-family:${c.body};font-size:14px;line-height:1.55;color:${mix(rowText, cardBg, 0.25)};">${rich(item.text, accent)}</div>` : ""}</td></tr></table>`;
          return block.boxed
            ? `<tr><td style="padding:0 0 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${cardBg}" style="background-color:${cardBg};border:1px solid ${mix(contrastOn(cardBg) === "#FFFFFF" ? "#FFFFFF" : "#0B1220", cardBg, 0.84)};border-radius:14px;"><tr><td style="padding:14px 16px;">${row}</td></tr></table></td></tr>`
            : `<tr><td style="padding:0 0 18px;">${row}</td></tr>`;
        })
        .join("");
      const head =
        (block.heading ? `<div style="padding-bottom:${block.subheading ? 8 : 22}px;">${h2(c, block.heading, color, accent, "center")}</div>` : "") +
        (block.subheading ? `<div style="padding:0 10px 22px;">${para(c, block.subheading, mix(color, bg, 0.25), 15, "center")}</div>` : "");
      return section(bg, `${head}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`, { top: 36, bottom: 22 });
    }

    // ----- testimonials ------------------------------------------------------
    case "testimonials": {
      const bg = c.color(block.bg, surface);
      const color = c.color(block.color, contrastOn(bg));
      const accent = c.color(block.accent, t.primary);
      const cardBg = c.color(block.cardBg, block.boxed ? (bg === "#FFFFFF" ? "#FFFFFF" : surface) : bg);
      const textColor = block.boxed ? contrastOn(cardBg) : color;
      const items = block.items
        .map((it) => {
          const body = `<div style="font-family:${c.body};font-size:18px;line-height:1.2;">${stars(it.rating)}</div><div style="padding-top:10px;font-family:${c.body};font-size:15px;line-height:1.65;color:${textColor};">&ldquo;${rich(it.quote, accent)}&rdquo;</div><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr><td width="46" valign="middle"><img src="${esc(appUrl(badgeAssetUrl(it.name.trim().charAt(0).toUpperCase() || "•", accent, contrastOn(accent), 38)))}" alt="" width="38" height="38" style="display:block;border:0;width:38px;height:38px;" /></td><td valign="middle"><div style="font-family:${c.head};font-size:14px;font-weight:700;color:${textColor};">${esc(it.name)}</div>${it.role ? `<div style="font-family:${c.body};font-size:12px;color:${mix(textColor, cardBg, 0.35)};">${esc(it.role)}</div>` : ""}</td></tr></table>`;
          return block.boxed
            ? `<tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${cardBg}" style="background-color:${cardBg};border:1px solid ${mix(contrastOn(cardBg) === "#FFFFFF" ? "#FFFFFF" : "#0B1220", cardBg, 0.84)};border-radius:16px;"><tr><td style="padding:20px 22px;">${body}</td></tr></table></td></tr>`
            : `<tr><td style="padding:0 0 22px;">${body}</td></tr>`;
        })
        .join("");
      const head = block.heading ? `<div style="padding-bottom:22px;">${h2(c, block.heading, color, accent)}</div>` : "";
      return section(bg, `${head}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>`, { top: 36, bottom: 18 });
    }

    // ----- split (image + text) ----------------------------------------------
    case "split": {
      const bg = c.color(block.bg, surface);
      const color = c.color(block.color, contrastOn(bg));
      const accent = c.color(block.accent, t.primary);
      const img = image(c, block.imageUrl, block.imageAlt, { maxWidth: 260, radius: 16 });
      const text =
        (block.eyebrow ? `<div style="padding-bottom:8px;font-family:${c.body};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${accent};">${esc(block.eyebrow)}</div>` : "") +
        `<div style="font-family:${c.head};font-size:24px;line-height:1.2;font-weight:800;color:${color};">${rich(block.headline, accent)}</div>` +
        (block.text ? `<div style="padding-top:10px;">${para(c, block.text, mix(color, bg, 0.2), 15)}</div>` : "") +
        (block.buttonLabel ? `<div style="padding-top:18px;">${button(c, block.buttonLabel, block.buttonUrl, accent, contrastOn(accent), "left", true)}</div>` : "");
      const imgCell = `<td class="stack" width="50%" valign="middle" style="width:50%;padding:0 10px 14px;">${img}</td>`;
      const textCell = `<td class="stack" width="50%" valign="middle" style="width:50%;padding:0 10px 14px;">${text}</td>`;
      return section(bg, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${block.imageSide === "left" ? imgCell + textCell : textCell + imgCell}</tr></table>`, { top: 30, bottom: 20, x: PAD - 10 });
    }

    // ----- callout -----------------------------------------------------------
    case "callout": {
      const outer = c.color(block.sectionBg, surface);
      const bg = c.color(block.bg, t.secondary);
      const color = c.color(block.color, contrastOn(bg));
      const accent = c.color(block.accent, contrastOn(bg) === "#FFFFFF" ? mix(t.accent, "#FFFFFF", 0.3) : t.primary);
      const lead = block.icon ? `<div style="padding-bottom:14px;">${icon(c, block.icon, mix(accent, bg, 0.82), accent, 48, "rounded")}</div>` : "";
      const inner =
        lead +
        `<div style="font-family:${c.head};font-size:22px;line-height:1.25;font-weight:800;color:${color};">${rich(block.headline, accent)}</div>` +
        (block.text ? `<div style="padding-top:10px;">${para(c, block.text, mix(color, bg, 0.12), 15)}</div>` : "") +
        (block.buttonLabel ? `<div style="padding-top:20px;">${button(c, block.buttonLabel, block.buttonUrl, contrastOn(bg) === "#FFFFFF" ? "#FFFFFF" : accent, contrastOn(bg) === "#FFFFFF" ? bg : contrastOn(accent), "left", true)}</div>` : "");
      return section(outer, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${bg}" style="background-color:${bg};border-radius:20px;"><tr><td style="padding:28px 28px 30px;">${inner}</td></tr></table>`, { top: 16, bottom: 16 });
    }

    // ----- wave divider ------------------------------------------------------
    case "wave": {
      const top = c.color(block.top, surface);
      const bottom = c.color(block.bottom, t.primary);
      const height = Math.max(16, Math.min(140, block.height ?? 56));
      const src = appUrl(waveAssetUrl(block.shape, top, bottom, height));
      return `<tr><td bgcolor="${top}" style="padding:0;font-size:0;line-height:0;background-color:${top};"><img class="fluid" src="${esc(src)}" alt="" width="${WIDTH}" style="display:block;width:100%;max-width:${WIDTH}px;height:auto;border:0;" /></td></tr>`;
    }
  }
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export function renderEmailHtml(blocks: EmailBlock[], options: RenderOptions = {}): string {
  const theme = options.theme ? parseTheme(options.theme) : DEFAULT_THEME;
  const tracking = options.tracking ?? null;
  const c = makeCtx(theme, tracking);
  const body = blocks.map((b) => renderBlock(b, c)).join("\n");
  const fonts = googleFontsHref(theme);
  const postalAddress = options.postalAddress?.trim();
  const postal = postalAddress
    ? `<div style="max-width:${WIDTH}px;margin:14px auto 0;font-family:${c.body};font-size:11px;line-height:1.5;color:${mix(contrastOn(theme.bg), theme.bg, 0.45)};text-align:center;">${esc(postalAddress)}</div>`
    : "";
  const pixel = tracking
    ? `<img src="${esc(appUrl(`/api/t/open/${tracking.recipientId}`))}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
    : "";
  const preheader = options.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${theme.bg};opacity:0;">${esc(options.preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title></title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
${fonts ? `<link href="${fonts}" rel="stylesheet" />` : ""}
<style>
  body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
  img{-ms-interpolation-mode:bicubic;}
  a{color:inherit;}
  @media only screen and (max-width:620px){
    .container{width:100%!important;}
    .px{padding-left:20px!important;padding-right:20px!important;}
    .stack{display:block!important;width:100%!important;max-width:100%!important;box-sizing:border-box;padding-left:0!important;padding-right:0!important;}
    .hide-m{display:none!important;}
    .fluid{width:100%!important;height:auto!important;}
    .h1{font-size:30px!important;line-height:1.15!important;}
    .h2{font-size:24px!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${theme.bg};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${theme.bg}" style="background-color:${theme.bg};">
<tr><td align="center" style="padding:24px 10px 32px;">
<!--[if mso]><table role="presentation" width="${WIDTH}" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="container" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0" bgcolor="${theme.surface}" style="width:${WIDTH}px;max-width:100%;background-color:${theme.surface};border-radius:18px;overflow:hidden;">
${body}
</table>
${postal}
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
${pixel}
</body>
</html>`;

  return applyMergeTags(html, options.vars ?? SAMPLE_VARS, "html");
}

export function renderEmailText(blocks: EmailBlock[], options: RenderOptions = {}): string {
  const tracking = options.tracking ?? null;
  const unsub = tracking ? appUrl(`/api/t/unsubscribe/${tracking.recipientId}`) : "{{unsubscribe_url}}";
  const strip = (s: string | undefined) => (s ?? "").replace(/\[\[(.+?)\]\]/g, "$1").replace(/\*\*(.+?)\*\*/g, "$1");
  const lines = (parts: (string | undefined)[]) => parts.filter(Boolean).join("\n");
  const out = blocks
    .map((block): string => {
      switch (block.type) {
        case "heading": return `${strip(block.text)}\n${"=".repeat(Math.min(60, strip(block.text).length))}`;
        case "text": return block.html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").trim();
        case "image": return block.alt ? `[image: ${block.alt}]` : "";
        case "button": return `${block.label}: ${block.url}`;
        case "divider": return "----------";
        case "spacer": return "";
        case "footer": return `${strip(block.text)}\nUnsubscribe: ${unsub}`;
        case "header": return lines([block.brand.toUpperCase(), ...block.links.map((l) => `${l.label}: ${l.url}`)]);
        case "hero": return lines([block.eyebrow?.toUpperCase(), strip(block.headline), strip(block.text), block.buttonLabel ? `${block.buttonLabel}: ${block.buttonUrl}` : undefined]);
        case "coupon": return lines([strip(block.headline), strip(block.text), `Code: ${block.code}`, block.buttonLabel ? `${block.buttonLabel}: ${block.buttonUrl}` : undefined]);
        case "cards": return lines([strip(block.heading), ...block.items.map((i) => lines([`• ${strip(i.title)}${i.price ? ` — ${i.price}` : ""}`, strip(i.text), i.buttonLabel ? `${i.buttonLabel}: ${i.buttonUrl}` : undefined]))]);
        case "list": return lines([strip(block.heading), ...block.items.map((i, n) => `${block.style === "numbers" ? `${n + 1}.` : "•"} ${strip(i.title)}${i.text ? ` — ${strip(i.text)}` : ""}`)]);
        case "testimonials": return lines([strip(block.heading), ...block.items.map((i) => `"${strip(i.quote)}" — ${i.name}${i.role ? `, ${i.role}` : ""}`)]);
        case "split": return lines([strip(block.headline), strip(block.text), block.buttonLabel ? `${block.buttonLabel}: ${block.buttonUrl}` : undefined]);
        case "callout": return lines([strip(block.headline), strip(block.text), block.buttonLabel ? `${block.buttonLabel}: ${block.buttonUrl}` : undefined]);
        case "links": return block.links.map((l) => `${l.label}: ${l.url}`).join("\n");
        case "social": return block.links.map((l) => `${l.network}: ${l.url}`).join("\n");
        case "wave": return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
  const postalText = options.postalAddress?.trim();
  return applyMergeTags(postalText ? `${out}\n\n${postalText}` : out, options.vars ?? SAMPLE_VARS, "text");
}
