import { mix } from "./theme";
import type { ArtName } from "./assets";

/**
 * Hand-drawn, brand-neutral illustrations used as template placeholders (products, devices, people).
 * They are drawn in the workspace's colours and meant to be replaced by the user's own photos.
 * Each returns a complete <svg> string; the image route rasterises it to PNG for email clients.
 */

type C = { c1: string; c2: string; c3: string };

const dark = (c: string, t = 0.22) => mix(c, "#000000", t);
const light = (c: string, t = 0.4) => mix(c, "#FFFFFF", t);
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
const shadow = (cx: number, cy: number, rx: number) =>
  `<defs><filter id="sh" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="7"/></filter></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="12" fill="#0B1220" opacity=".22" filter="url(#sh)"/>`;
const lg = (id: string, a: string, b: string, x2 = 1, y2 = 0) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const face = (cx: number, cy: number, r: number, fill: string) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/><circle cx="${cx - r * 0.36}" cy="${cy - r * 0.12}" r="${r * 0.11}" fill="#1B2433"/><circle cx="${cx + r * 0.36}" cy="${cy - r * 0.12}" r="${r * 0.11}" fill="#1B2433"/><path d="M${cx - r * 0.42} ${cy + r * 0.25} Q${cx} ${cy + r * 0.66} ${cx + r * 0.42} ${cy + r * 0.25}" fill="none" stroke="#1B2433" stroke-width="${r * 0.1}" stroke-linecap="round"/>`;

const bar = (x: number, y: number, w: number, fill = "#CBD5E1", h = 8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`;

const draw: Record<ArtName, (c: C) => string> = {
  bottle: ({ c1, c2, c3 }) =>
    svg(400, 440, `<defs>${lg("b", dark(c1, 0.18), c1)}${lg("b2", c1, dark(c1, 0.28))}${lg("cap", light(c3, 0.25), dark(c3, 0.12), 0, 1)}</defs>` +
      shadow(200, 418, 100) +
      `<rect x="150" y="112" width="100" height="56" rx="10" fill="url(#b2)"/>` +
      `<rect x="120" y="150" width="160" height="262" rx="32" fill="url(#b)"/>` +
      `<rect x="138" y="62" width="124" height="62" rx="14" fill="url(#cap)"/>` +
      `<rect x="150" y="72" width="100" height="8" rx="4" fill="#fff" opacity=".35"/>` +
      `<rect x="128" y="204" width="144" height="160" rx="18" fill="#fff"/>` +
      `<path d="M128 222a18 18 0 0 1 18-18h108a18 18 0 0 1 18 18v14H128z" fill="${c2}"/>` +
      face(200, 292, 30, c3) + bar(152, 336, 96) + bar(168, 350, 64, "#E2E8F0") +
      `<rect x="134" y="160" width="12" height="238" rx="6" fill="#fff" opacity=".22"/>`),

  jar: ({ c1, c2, c3 }) =>
    svg(400, 400, `<defs>${lg("b", dark(c1, 0.16), light(c1, 0.12))}${lg("lid", light(c3, 0.3), dark(c3, 0.1), 0, 1)}</defs>` +
      shadow(200, 372, 130) +
      `<rect x="84" y="138" width="232" height="226" rx="44" fill="url(#b)"/>` +
      `<rect x="70" y="82" width="260" height="72" rx="20" fill="url(#lid)"/>` +
      [96, 118, 140, 162, 184, 206, 228, 250, 272, 294].map((x) => `<rect x="${x}" y="92" width="6" height="52" rx="3" fill="#000" opacity=".07"/>`).join("") +
      `<rect x="102" y="186" width="196" height="150" rx="26" fill="#fff"/>` +
      `<path d="M102 212a26 26 0 0 1 26-26h144a26 26 0 0 1 26 26v8H102z" fill="${c2}"/>` +
      face(200, 266, 36, c3) + bar(140, 316, 120) +
      `<circle cx="64" cy="372" r="22" fill="${c3}"/><circle cx="104" cy="382" r="16" fill="${light(c1, 0.2)}"/><circle cx="336" cy="374" r="20" fill="${light(c3, 0.1)}"/><circle cx="300" cy="384" r="15" fill="${c1}"/>`),

  box: ({ c1, c2, c3 }) =>
    svg(400, 400, `<defs>${lg("f", light(c1, 0.12), dark(c1, 0.12), 0, 1)}</defs>` +
      shadow(205, 372, 140) +
      `<polygon points="72,178 150,138 340,138 262,178" fill="${light(c1, 0.35)}"/>` +
      `<polygon points="262,178 340,138 340,330 262,368" fill="${dark(c1, 0.3)}"/>` +
      `<rect x="72" y="178" width="190" height="190" rx="6" fill="url(#f)"/>` +
      `<circle cx="167" cy="244" r="38" fill="#fff"/><path d="M167 224c-14 8-20 22-12 38 12-2 24-10 24-30-4 4-8 6-12-8z" fill="${c3}"/>` +
      bar(112, 304, 110, "#fff") + bar(128, 322, 78, light(c1, 0.55)) +
      `<polygon points="150,138 340,138 340,150 150,150" fill="${c2}" opacity=".25"/>`),

  tube: ({ c1, c2, c3 }) =>
    svg(400, 440, `<defs>${lg("t", dark(c1, 0.2), light(c1, 0.1))}${lg("cap", light(c3, 0.3), dark(c3, 0.1))}</defs>` +
      shadow(200, 420, 90) +
      `<rect x="146" y="352" width="108" height="64" rx="14" fill="url(#cap)"/>` +
      `<path d="M140 354 L152 100 Q200 84 248 100 L260 354 Z" fill="url(#t)"/>` +
      `<rect x="150" y="56" width="100" height="52" rx="4" fill="${dark(c1, 0.15)}"/>` +
      [64, 76, 88, 100].map((y) => `<rect x="150" y="${y - 4}" width="100" height="3" fill="#000" opacity=".12"/>`).join("") +
      `<path d="M158 206 Q200 186 242 206 L246 300 Q200 318 154 300 Z" fill="#fff"/>` +
      `<path d="M158 206 Q200 186 242 206 L243 224 Q200 206 157 224 Z" fill="${c2}"/>` +
      face(200, 262, 24, c3) + bar(170, 296, 60) +
      `<rect x="154" y="120" width="12" height="214" rx="6" fill="#fff" opacity=".2"/>`),

  water: ({ c1, c2 }) =>
    svg(400, 460, `<defs>${lg("m", "#F8FAFC", "#94A3B8", 0, 1)}${lg("w", light(c1, 0.25), dark(c1, 0.1), 0, 1)}</defs>` +
      `<path d="M40 330 C 10 200, 90 110, 190 130 C 120 140, 70 220, 96 318" fill="${light(c1, 0.55)}" opacity=".75"/>` +
      `<path d="M360 330 C 392 200, 312 110, 214 130 C 282 140, 334 220, 304 318" fill="${light(c1, 0.55)}" opacity=".75"/>` +
      shadow(200, 436, 96) +
      `<rect x="150" y="30" width="100" height="62" rx="12" fill="url(#m)"/><rect x="150" y="30" width="100" height="10" rx="5" fill="#fff" opacity=".6"/>` +
      `<rect x="138" y="86" width="124" height="320" rx="34" fill="#fff" opacity=".55" stroke="#fff" stroke-width="3"/>` +
      `<rect x="146" y="150" width="108" height="250" rx="28" fill="url(#w)" opacity=".7"/>` +
      `<path d="M146 168 Q173 156 200 168 T254 168" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>` +
      `<circle cx="180" cy="250" r="7" fill="#fff" opacity=".7"/><circle cx="220" cy="300" r="5" fill="#fff" opacity=".7"/><circle cx="196" cy="340" r="9" fill="#fff" opacity=".6"/>` +
      `<rect x="130" y="392" width="140" height="44" rx="16" fill="url(#m)"/>` + `<rect x="162" y="408" width="76" height="9" rx="4.5" fill="${c2}" opacity=".7"/>` +
      `<rect x="152" y="104" width="12" height="280" rx="6" fill="#fff" opacity=".6"/>`),

  phone: ({ c1, c2, c3 }) =>
    svg(400, 480, shadow(200, 462, 100) +
      `<rect x="108" y="28" width="184" height="420" rx="36" fill="#0F172A"/>` +
      `<rect x="118" y="40" width="164" height="396" rx="28" fill="#fff"/>` +
      `<rect x="168" y="48" width="64" height="14" rx="7" fill="#0F172A"/>` +
      `<rect x="118" y="70" width="164" height="54" fill="${c1}"/>` + bar(134, 88, 74, "#fff", 9) + bar(134, 104, 48, light(c1, 0.6), 7) +
      `<circle cx="258" cy="97" r="13" fill="${light(c1, 0.6)}"/>` +
      `<rect x="132" y="140" width="104" height="38" rx="14" fill="#EEF2F7"/>` + bar(144, 154, 70, "#CBD5E1") +
      `<rect x="164" y="190" width="104" height="38" rx="14" fill="${c1}"/>` + bar(176, 204, 70, "#fff") +
      `<rect x="132" y="240" width="136" height="76" rx="14" fill="${light(c3, 0.78)}"/><circle cx="156" cy="266" r="14" fill="${c3}"/>` + bar(180, 256, 70, c2, 9) + bar(180, 274, 52, "#94A3B8", 7) + bar(144, 296, 100, "#94A3B8", 7) +
      `<rect x="132" y="328" width="136" height="34" rx="12" fill="#EEF2F7"/>` + bar(144, 342, 80, "#CBD5E1") +
      `<rect x="132" y="386" width="136" height="32" rx="16" fill="${c1}"/>` + bar(170, 399, 60, "#fff", 7)),

  laptop: ({ c1, c2, c3 }) =>
    svg(600, 400, `<defs>${lg("base", "#E5E7EB", "#9CA3AF", 0, 1)}</defs>` + shadow(300, 372, 230) +
      `<rect x="92" y="34" width="416" height="262" rx="16" fill="#111827"/>` +
      `<rect x="102" y="44" width="396" height="242" rx="8" fill="#fff"/>` +
      `<rect x="102" y="44" width="62" height="242" rx="8" fill="${c2}"/>` +
      [70, 92, 114, 136].map((y, i) => `<rect x="116" y="${y}" width="34" height="8" rx="4" fill="#fff" opacity="${i === 0 ? 0.95 : 0.4}"/>`).join("") +
      bar(180, 60, 90, "#E2E8F0", 10) + `<circle cx="478" cy="65" r="9" fill="${c1}"/>` +
      [0, 1, 2].map((i) => `<rect x="${180 + i * 102}" y="88" width="92" height="54" rx="10" fill="${[light(c1, 0.82), light(c3, 0.8), "#F1F5F9"][i]}"/>` + bar(190 + i * 102, 100, 40, "#94A3B8", 7) + bar(190 + i * 102, 116, 56, [c1, c3, c2][i], 12)).join("") +
      `<rect x="180" y="154" width="296" height="62" rx="10" fill="#F8FAFC"/>` +
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect x="${194 + i * 31}" y="${200 - [20, 34, 26, 40, 30, 44, 36, 48, 40][i]}" width="18" height="${[20, 34, 26, 40, 30, 44, 36, 48, 40][i]}" rx="4" fill="${i % 2 ? c3 : c1}"/>`).join("") +
      [228, 246, 264].map((y) => bar(180, y, 296, "#EEF2F7", 10) + bar(190, y + 1, 60, "#CBD5E1", 8) + `<rect x="430" y="${y}" width="40" height="10" rx="5" fill="${light(c3, 0.5)}"/>`).join("") +
      `<path d="M56 304 H544 L520 322 Q516 330 506 330 H94 Q84 330 80 322 Z" fill="url(#base)"/><rect x="262" y="304" width="76" height="8" rx="4" fill="#9CA3AF"/>`),

  photo: ({ c1, c2, c3 }) =>
    svg(600, 400, `<defs>${lg("bg", light(c3, 0.55), light(c1, 0.5), 0.6, 1)}</defs>` +
      `<rect width="600" height="400" fill="url(#bg)"/>` +
      `<circle cx="450" cy="120" r="54" fill="#fff" opacity=".55"/><circle cx="450" cy="120" r="34" fill="#fff" opacity=".75"/>` +
      `<path d="M0 290 Q110 180 230 270 T440 250 T600 270 V400 H0 Z" fill="${c1}" opacity=".45"/>` +
      `<path d="M0 330 Q150 250 290 320 T600 300 V400 H0 Z" fill="${c2}" opacity=".5"/>` +
      `<g opacity=".9" transform="translate(262 150)"><rect x="0" y="14" width="76" height="52" rx="10" fill="#fff"/><rect x="22" y="4" width="32" height="14" rx="5" fill="#fff"/><circle cx="38" cy="40" r="15" fill="${c1}" opacity=".8"/><circle cx="38" cy="40" r="8" fill="#fff"/></g>`),

  people: ({ c1, c2, c3 }) =>
    svg(600, 400, `<defs>${lg("bg", light(c1, 0.35), light(c3, 0.45), 1, 1)}</defs>` +
      `<rect width="600" height="400" fill="url(#bg)"/><circle cx="470" cy="90" r="120" fill="#fff" opacity=".18"/>` +
      `<path d="M70 400 C70 300 130 270 200 270 C270 270 330 300 330 400 Z" fill="#fff"/>` +
      `<rect x="178" y="216" width="44" height="60" rx="18" fill="#E7B58E"/><circle cx="200" cy="170" r="54" fill="#F1C7A0"/>` +
      `<path d="M146 168 C140 112 190 96 226 108 C256 118 262 150 254 176 C240 140 196 134 146 168 Z" fill="#3B2A22"/>` +
      `<path d="M176 190 Q200 210 224 190" fill="none" stroke="#7A4A33" stroke-width="5" stroke-linecap="round"/><circle cx="182" cy="170" r="5" fill="#2A1D17"/><circle cx="218" cy="170" r="5" fill="#2A1D17"/>` +
      `<path d="M280 400 C280 310 340 282 410 282 C480 282 540 312 540 400 Z" fill="${c2}"/>` +
      `<rect x="388" y="232" width="44" height="58" rx="18" fill="#C98F68"/><circle cx="410" cy="186" r="52" fill="#D9A27A"/>` +
      `<path d="M356 190 C348 120 410 100 456 128 C470 150 468 178 462 196 C444 150 396 146 356 190 Z" fill="#1D1613"/>` +
      `<path d="M386 206 Q410 226 434 206" fill="none" stroke="#6B3E29" stroke-width="5" stroke-linecap="round"/><circle cx="392" cy="188" r="5" fill="#241812"/><circle cx="428" cy="188" r="5" fill="#241812"/>`),

  food: () =>
    svg(600, 300, `<defs><filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="6"/></filter></defs>` +
      [[110, "#E5483B", "#F58B80"], [300, "#FFFFFF", "#F6C945"], [490, "#7FB539", "#B7DB6A"]].map(([cx, a, b], i) =>
        `<ellipse cx="${cx}" cy="${232}" rx="82" ry="12" fill="#0B1220" opacity=".16" filter="url(#sh)"/>` +
        (i === 1
          ? `<ellipse cx="${cx}" cy="140" rx="86" ry="78" fill="#fff" stroke="#E9EDF3" stroke-width="3"/><circle cx="${cx}" cy="140" r="42" fill="${b}"/><circle cx="${Number(cx) - 12}" cy="128" r="12" fill="#fff" opacity=".4"/>`
          : `<circle cx="${cx}" cy="140" r="84" fill="${a}"/><circle cx="${cx}" cy="140" r="64" fill="${b}"/>` +
            (i === 0
              ? [0, 60, 120, 180, 240, 300].map((deg) => `<ellipse cx="${Number(cx) + 34 * Math.cos((deg * Math.PI) / 180)}" cy="${140 + 34 * Math.sin((deg * Math.PI) / 180)}" rx="9" ry="14" fill="#F9D86A" transform="rotate(${deg + 90} ${Number(cx) + 34 * Math.cos((deg * Math.PI) / 180)} ${140 + 34 * Math.sin((deg * Math.PI) / 180)})"/>`).join("")
              : [0, 40, 80, 120, 160, 200, 240, 280, 320].map((deg) => `<circle cx="${Number(cx) + 38 * Math.cos((deg * Math.PI) / 180)}" cy="${140 + 38 * Math.sin((deg * Math.PI) / 180)}" r="4" fill="#243816"/>`).join("") + `<circle cx="${cx}" cy="140" r="14" fill="#EAF5C8"/>`))).join("")),

  gummies: ({ c1, c3 }) =>
    svg(500, 300, `<defs><filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="7"/></filter></defs>` +
      [[130, 160, 108, c3], [260, 140, 118, c1], [380, 170, 100, "#F59E0B"]].map(([cx, cy, r, fill]) =>
        `<ellipse cx="${cx}" cy="${Number(cy) + Number(r) - 6}" rx="${Number(r) * 0.8}" ry="12" fill="#0B1220" opacity=".18" filter="url(#sh)"/>` +
        `<rect x="${Number(cx) - Number(r) / 2}" y="${Number(cy) - Number(r) / 2}" width="${r}" height="${r}" rx="${Number(r) * 0.38}" fill="${fill}"/>` +
        `<rect x="${Number(cx) - Number(r) / 2 + 10}" y="${Number(cy) - Number(r) / 2 + 10}" width="${Number(r) * 0.4}" height="${Number(r) * 0.2}" rx="8" fill="#fff" opacity=".35"/>` +
        face(Number(cx), Number(cy) + 4, Number(r) * 0.3, "rgba(255,255,255,0)")).join("")),

  basket: ({ c1, c2, c3 }) =>
    svg(500, 400, shadow(250, 372, 190) +
      `<rect x="150" y="70" width="86" height="190" rx="14" fill="${c1}"/><rect x="164" y="110" width="58" height="60" rx="10" fill="#fff"/>` + face(193, 140, 18, c3) +
      `<rect x="258" y="110" width="96" height="150" rx="12" fill="${c3}"/><rect x="258" y="110" width="96" height="20" rx="8" fill="${dark(c3, 0.2)}"/>` +
      `<rect x="346" y="150" width="76" height="110" rx="12" fill="${c2}"/>` + bar(356, 176, 56, "#fff", 8) + bar(356, 192, 38, light(c2, 0.6), 7) +
      `<path d="M60 238 H440 L408 358 Q404 372 388 372 H112 Q96 372 92 358 Z" fill="${c2}"/>` +
      [96, 150, 204, 258, 312, 366].map((x) => `<path d="M${x} 244 L${x + 10} 366" stroke="#fff" stroke-opacity=".28" stroke-width="5"/>`).join("") +
      [268, 304, 340].map((y) => `<path d="M72 ${y} H428" stroke="#fff" stroke-opacity=".22" stroke-width="5"/>`).join("") +
      `<rect x="48" y="226" width="404" height="22" rx="11" fill="${dark(c2, 0.2)}"/>`),
};

export function artSvg(name: ArtName, colors: C) {
  return draw[name](colors);
}
