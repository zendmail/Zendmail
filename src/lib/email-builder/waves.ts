/**
 * Section-divider shapes, drawn in a 1200 x 100 box. Each returns the SVG path of the region that
 * belongs to the TOP section (the colour of the section above); the rest of the box is the BOTTOM colour.
 */
export const WAVE_SHAPES = ["wave", "curve", "dip", "slant", "drip", "scallop"] as const;
export type WaveShape = (typeof WAVE_SHAPES)[number];

const W = 1200;
const H = 100;

function polyline(fn: (x: number) => number, step = 10) {
  const pts: string[] = [];
  for (let x = 0; x <= W; x += step) pts.push(`${x} ${fn(x).toFixed(1)}`);
  return `M0 0 L${W} 0 L${W} ${fn(W).toFixed(1)} ` + pts.reverse().map((p) => `L${p}`).join(" ") + " Z";
}

export function wavePath(shape: WaveShape): string {
  switch (shape) {
    case "wave":
      return polyline((x) => 50 + 26 * Math.sin((x / 1200) * Math.PI * 4 + 0.6));
    case "curve": // bottom section arches up in the middle
      return polyline((x) => H - 88 * (1 - Math.pow((x - 600) / 600, 2)) + 8);
    case "dip": // top section hangs down in the middle
      return polyline((x) => 8 + 88 * (1 - Math.pow((x - 600) / 600, 2)));
    case "slant":
      return `M0 0 L${W} 0 L${W} 0 L0 ${H} Z`;
    case "scallop": {
      const r = 50;
      return polyline((x) => 30 + 62 * Math.sqrt(Math.max(0, 1 - Math.pow(((x % (2 * r)) - r) / r, 2))), 5);
    }
    case "drip": {
      // Top colour with rounded drops hanging into the bottom section.
      const drops: [number, number, number][] = [
        [40, 58, 84], [150, 74, 40], [250, 54, 96], [380, 70, 52], [490, 56, 78], [610, 76, 36], [720, 56, 90],
        [850, 72, 48], [960, 54, 82], [1070, 70, 58], [1160, 50, 70],
      ];
      let d = `M0 0 L${W} 0 L${W} 22`;
      const sorted = [...drops].sort((a, b) => b[0] - a[0]);
      for (const [cx, w, len] of sorted) {
        const r = w / 2;
        d += ` L${cx + r + 14} 22 Q${cx + r} 22 ${cx + r} 38 L${cx + r} ${len - r} A${r} ${r} 0 0 1 ${cx - r} ${len - r} L${cx - r} 38 Q${cx - r} 22 ${cx - r - 14} 22`;
      }
      return d + " L0 22 Z";
    }
  }
}
