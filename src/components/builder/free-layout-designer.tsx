"use client";

import * as React from "react";
import { AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignHorizontalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart, ArrowDown, ArrowUp, Copy, Image as ImageIcon, LoaderCircle, Minus, MousePointerClick, Plus, Redo2, Shapes, Trash2, Type, Undo2, X } from "lucide-react";
import type { CanvasItem, EmailBlock, EmailTheme } from "@/db/schema";
import { CANVAS_WIDTH, canvasFont, canvasFontSize } from "@/lib/email-builder/canvas";
import { resolveImageUrl } from "@/lib/email-builder/assets";
import { contrastOn, resolveColor } from "@/lib/email-builder/theme";
import { uploadCampaignImage } from "@/components/campaigns/upload-image";
import { exportCanvasBlob } from "./canvas-export";
import { ColorField, ImageField, type UploadScope } from "./fields";

type CanvasBlock = Extract<EmailBlock, { type: "canvas" }>;
type Snapshot = { items: CanvasItem[]; height: number; bg: string; link: string };
type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type Gesture =
  | { kind: "move"; px: number; py: number; origin: CanvasItem }
  | { kind: "resize"; dir: Dir; px: number; py: number; origin: CanvasItem };

const W = CANVAS_WIDTH;
const SNAP = 5;
const RULER = 22;
const GRID = 10;
type Guides = { x: number[]; y: number[] };
type GridMode = "off" | "show" | "snap";
const HANDLES: { dir: Dir; x: number; y: number; cursor: string }[] = [
  { dir: "nw", x: 0, y: 0, cursor: "nwse-resize" }, { dir: "n", x: 0.5, y: 0, cursor: "ns-resize" }, { dir: "ne", x: 1, y: 0, cursor: "nesw-resize" },
  { dir: "e", x: 1, y: 0.5, cursor: "ew-resize" }, { dir: "se", x: 1, y: 1, cursor: "nwse-resize" }, { dir: "s", x: 0.5, y: 1, cursor: "ns-resize" },
  { dir: "sw", x: 0, y: 1, cursor: "nesw-resize" }, { dir: "w", x: 0, y: 0.5, cursor: "ew-resize" },
];
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const input = "h-8 w-full rounded-[8px] border border-border bg-surface px-2.5 text-[13px] text-text-primary outline-none focus:border-primary";

function newItem(kind: CanvasItem["kind"], offset: number): CanvasItem {
  const o = (offset % 6) * 14;
  switch (kind) {
    case "text": return { kind, text: "Your text here", x: 40 + o, y: 40 + o, w: 260, h: 50, fontSize: 24, color: "@text", font: "sans", align: "left" };
    case "button": return { kind, text: "Click here", url: "https://example.com", x: 40 + o, y: 40 + o, w: 180, h: 48, fontSize: 16, weight: "bold", align: "center", bg: "@primary", color: "@onPrimary", radius: 24 };
    case "image": return { kind, imageUrl: "", x: 40 + o, y: 40 + o, w: 220, h: 160, radius: 12 };
    case "shape": return { kind, x: 40 + o, y: 40 + o, w: 160, h: 160, bg: "@accent", radius: 0 };
  }
}

function Ruler({ axis, length, scale, onStart, onMove, onEnd }: { axis: "x" | "y"; length: number; scale: number; onStart: (e: React.PointerEvent) => void; onMove: (e: React.PointerEvent) => void; onEnd: () => void }) {
  const horizontal = axis === "x";
  const labels = Array.from({ length: Math.floor(length / 50) + 1 }, (_, i) => i * 50);
  const tick = (deg: number, every: number, size: number) => `repeating-linear-gradient(${deg}deg, #98a2b3 0 1px, transparent 1px ${every * scale}px) ${horizontal ? `0 100% / 100% ${size}px` : `100% 0 / ${size}px 100%`} no-repeat`;
  return (
    <div
      onPointerDown={onStart} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd}
      title="Drag to add a guide"
      className={`absolute select-none bg-surface text-[9px] text-text-tertiary ${horizontal ? "cursor-row-resize" : "cursor-col-resize"}`}
      style={horizontal ? { left: RULER, top: 0, width: length * scale, height: RULER - 2 } : { left: 0, top: RULER, width: RULER - 2, height: length * scale }}
    >
      <div className="absolute inset-0" style={{ background: `${tick(horizontal ? 90 : 180, 10, 5)}, ${tick(horizontal ? 90 : 180, 50, 10)}` }} />
      {labels.map((n) => (
        <span key={n} className="absolute leading-none" style={horizontal ? { left: n * scale + 3, top: 2 } : { top: n * scale + 3, left: 1, writingMode: "vertical-rl" }}>{n}</span>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-[11.5px] font-medium text-text-secondary">{label}</span>{children}</label>);
}
function Num({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" className={input} value={Math.round(value)} min={min} max={max} onChange={(e) => e.target.value !== "" && onChange(clamp(Number(e.target.value), min, max))} />
    </Field>
  );
}
function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)} className={`h-8 flex-1 rounded-[8px] border px-2 text-[12px] font-medium ${value === o.value ? "border-primary bg-primary-surface text-primary" : "border-border text-text-secondary hover:bg-surface-secondary"}`}>{o.label}</button>
      ))}
    </div>
  );
}

export function FreeLayoutDesigner({ block, theme, scope, notice, onApply, onClose }: { block: CanvasBlock; theme: EmailTheme; scope: UploadScope; notice?: string; onApply: (next: CanvasBlock) => void; onClose: () => void }) {
  const [state, setState] = React.useState<Snapshot>({ items: block.items, height: block.height, bg: block.bg ?? "", link: block.link ?? "" });
  const [sel, setSel] = React.useState<number | null>(null);
  const [guides, setGuides] = React.useState<{ x?: number; y?: number }>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [fit, setFit] = React.useState(1);
  const [zoom, setZoom] = React.useState<number | null>(null);
  const [margin, setMargin] = React.useState(24);
  const [showMargin, setShowMargin] = React.useState(true);
  const [gridMode, setGridMode] = React.useState<GridMode>("off");
  const [guideLines, setGuideLines] = React.useState<Guides>({ x: [], y: [] });
  const guideRef = React.useRef<Guides>({ x: [], y: [] });
  const guideDrag = React.useRef<{ axis: "x" | "y"; index: number | null } | null>(null);
  const stageEl = React.useRef<HTMLDivElement>(null);
  const scale = zoom ?? fit;
  const past = React.useRef<Snapshot[]>([]);
  const future = React.useRef<Snapshot[]>([]);
  const lastKey = React.useRef<string | null>(null);
  const area = React.useRef<HTMLDivElement>(null);
  const gesture = React.useRef<Gesture | null>(null);
  const stateRef = React.useRef(state);
  React.useEffect(() => { stateRef.current = state; }, [state]);

  React.useEffect(() => {
    const el = area.current;
    if (!el) return;
    const measure = () => setFit(clamp((el.clientWidth - 32 - RULER) / W, 0.3, 1.4));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Ctrl/Cmd + wheel zooms the design instead of the whole browser page.
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clamp(Math.round(((z ?? 1) - Math.sign(e.deltaY) * 0.1) * 100) / 100, 0.25, 3));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => { ro.disconnect(); el.removeEventListener("wheel", wheel); };
  }, []);
  const setGuides2 = (g: Guides) => { guideRef.current = g; setGuideLines(g); };

  /** Applies a change; changes with the same key (typing, dragging) share one undo step. */
  const commit = React.useCallback((next: Snapshot, key: string | null) => {
    if (key === null || key !== lastKey.current) { past.current.push(stateRef.current); if (past.current.length > 80) past.current.shift(); }
    lastKey.current = key;
    future.current = [];
    stateRef.current = next;
    setState(next);
  }, []);
  const undo = React.useCallback(() => { const p = past.current.pop(); if (!p) return; future.current.push(stateRef.current); lastKey.current = null; stateRef.current = p; setState(p); setSel(null); }, []);
  const redo = React.useCallback(() => { const n = future.current.pop(); if (!n) return; past.current.push(stateRef.current); lastKey.current = null; stateRef.current = n; setState(n); setSel(null); }, []);

  const patchItem = (i: number, patch: Partial<CanvasItem>, key: string | null = null) => {
    const items = stateRef.current.items.map((it, n) => (n === i ? { ...it, ...patch } : it));
    commit({ ...stateRef.current, items }, key ?? `p:${i}:${Object.keys(patch).join(",")}`);
  };
  const add = (kind: CanvasItem["kind"]) => {
    const items = [...stateRef.current.items, newItem(kind, stateRef.current.items.length)];
    commit({ ...stateRef.current, items }, null);
    setSel(items.length - 1);
  };
  const remove = (i: number) => { commit({ ...stateRef.current, items: stateRef.current.items.filter((_, n) => n !== i) }, null); setSel(null); };
  const duplicate = (i: number) => {
    const src = stateRef.current.items[i];
    const items = [...stateRef.current.items, { ...src, x: src.x + 16, y: src.y + 16 }];
    commit({ ...stateRef.current, items }, null);
    setSel(items.length - 1);
  };
  const reorder = (i: number, to: number) => {
    const items = [...stateRef.current.items];
    if (to < 0 || to >= items.length) return;
    const [it] = items.splice(i, 1);
    items.splice(to, 0, it);
    commit({ ...stateRef.current, items }, null);
    setSel(to);
  };

  // ---- pointer gestures (move / resize) with snapping to the edges and centre of the page and other elements
  function snapAxis(value: number, size: number, targets: number[]): { v: number; guide?: number } {
    let best: { v: number; guide: number; d: number } | null = null;
    for (const anchor of [0, size / 2, size]) {
      for (const t of targets) {
        const d = Math.abs(value + anchor - t);
        if (d <= SNAP && (!best || d < best.d)) best = { v: t - anchor, guide: t, d };
      }
    }
    return best ? { v: best.v, guide: best.guide } : { v: value };
  }
  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || sel === null) return;
    const dx = (e.clientX - g.px) / scale, dy = (e.clientY - g.py) / scale;
    const { items, height } = stateRef.current;
    const o = g.origin;
    const others = items.filter((_, n) => n !== sel);
    const mg = showMargin && margin > 0 ? margin : null;
    const xt = [0, W / 2, W, ...(mg !== null ? [mg, W - mg] : []), ...guideRef.current.x, ...others.flatMap((i) => [i.x, i.x + i.w / 2, i.x + i.w])];
    const yt = [0, height / 2, height, ...(mg !== null ? [mg, height - mg] : []), ...guideRef.current.y, ...others.flatMap((i) => [i.y, i.y + i.h / 2, i.y + i.h])];
    const grid = gridMode === "snap" && !e.altKey ? (n: number) => Math.round(n / GRID) * GRID : (n: number) => n;
    let next: CanvasItem;
    const guide: { x?: number; y?: number } = {};
    if (g.kind === "move") {
      const sx = e.altKey ? { v: o.x + dx } : gridMode === "snap" ? { v: grid(o.x + dx) } : snapAxis(o.x + dx, o.w, xt);
      const sy = e.altKey ? { v: o.y + dy } : gridMode === "snap" ? { v: grid(o.y + dy) } : snapAxis(o.y + dy, o.h, yt);
      guide.x = "guide" in sx ? sx.guide : undefined; guide.y = "guide" in sy ? sy.guide : undefined;
      next = { ...o, x: Math.round(sx.v), y: Math.round(sy.v) };
    } else {
      let { x, y, w, h } = o;
      if (g.dir.includes("e")) w = Math.max(8, o.w + dx);
      if (g.dir.includes("s")) h = Math.max(8, o.h + dy);
      if (g.dir.includes("w")) { w = Math.max(8, o.w - dx); x = o.x + o.w - w; }
      if (g.dir.includes("n")) { h = Math.max(8, o.h - dy); y = o.y + o.h - h; }
      if (e.shiftKey && o.h > 0 && g.dir.length === 2) { const ratio = o.w / o.h; h = w / ratio; if (g.dir.includes("n")) y = o.y + o.h - h; }
      next = { ...o, x: Math.round(grid(x)), y: Math.round(grid(y)), w: Math.round(grid(w)), h: Math.round(grid(h)) };
    }
    setGuides(guide);
    commit({ ...stateRef.current, items: items.map((it, n) => (n === sel ? next : it)) }, `g:${sel}:${g.kind}`);
  }
  function endGesture() { gesture.current = null; lastKey.current = null; setGuides({}); }
  function startMove(e: React.PointerEvent, i: number) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).closest("[data-stage]")?.setPointerCapture(e.pointerId);
    setSel(i);
    gesture.current = { kind: "move", px: e.clientX, py: e.clientY, origin: stateRef.current.items[i] };
  }
  function startResize(e: React.PointerEvent, dir: Dir) {
    if (sel === null) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).closest("[data-stage]")?.setPointerCapture(e.pointerId);
    gesture.current = { kind: "resize", dir, px: e.clientX, py: e.clientY, origin: stateRef.current.items[sel] };
  }

  function alignItem(how: "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom") {
    if (sel === null) return;
    const it = stateRef.current.items[sel];
    const m = showMargin ? margin : 0;
    const H = stateRef.current.height;
    const patch: Partial<CanvasItem> =
      how === "left" ? { x: m } : how === "right" ? { x: W - m - it.w } : how === "hcenter" ? { x: Math.round((W - it.w) / 2) }
      : how === "top" ? { y: m } : how === "bottom" ? { y: H - m - it.h } : { y: Math.round((H - it.h) / 2) };
    patchItem(sel, patch, null);
  }

  /** Guides are dragged out of the rulers (like Canva) and dragged back onto a ruler to remove them. */
  function startGuide(e: React.PointerEvent, axis: "x" | "y", index: number | null) {
    e.stopPropagation(); e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    guideDrag.current = { axis, index };
  }
  function moveGuide(e: React.PointerEvent) {
    const d = guideDrag.current, rect = stageEl.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const v = Math.round(d.axis === "x" ? (e.clientX - rect.left) / scale : (e.clientY - rect.top) / scale);
    const list = [...guideRef.current[d.axis]];
    if (d.index === null) { list.push(v); d.index = list.length - 1; } else list[d.index] = v;
    setGuides2({ ...guideRef.current, [d.axis]: list });
  }
  function endGuide() {
    const d = guideDrag.current;
    guideDrag.current = null;
    if (!d || d.index === null) return;
    const v = guideRef.current[d.axis][d.index];
    const max = d.axis === "x" ? W : stateRef.current.height;
    if (v < 0 || v > max) setGuides2({ ...guideRef.current, [d.axis]: guideRef.current[d.axis].filter((_, n) => n !== d.index) });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (sel === null) return;
    const step = e.shiftKey ? 10 : 1;
    const it = stateRef.current.items[sel];
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(sel); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(sel); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); patchItem(sel, { x: it.x - step }, `k:${sel}`); }
    else if (e.key === "ArrowRight") { e.preventDefault(); patchItem(sel, { x: it.x + step }, `k:${sel}`); }
    else if (e.key === "ArrowUp") { e.preventDefault(); patchItem(sel, { y: it.y - step }, `k:${sel}`); }
    else if (e.key === "ArrowDown") { e.preventDefault(); patchItem(sel, { y: it.y + step }, `k:${sel}`); }
    else if (e.key === "Escape") setSel(null);
  }

  async function apply() {
    setBusy(true); setError("");
    try {
      const items = state.items.map((i) => ({ ...i, x: Math.round(i.x), y: Math.round(i.y), w: Math.round(i.w), h: Math.round(i.h) }));
      let rendered = block.rendered;
      if (scope.kind !== "landing") {
        const { blob, type } = await exportCanvasBlob({ items, height: state.height, bg: state.bg, theme });
        rendered = await uploadCampaignImage(scope.id, new File([blob], type === "image/png" ? "design.png" : "design.jpg", { type }), scope.kind);
      }
      onApply({ ...block, items, height: state.height, bg: state.bg || undefined, link: state.link || undefined, rendered });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the design.");
      setBusy(false);
    }
  }

  const bgColor = resolveColor(state.bg, theme, "#FFFFFF");
  const item = sel !== null ? state.items[sel] : null;

  function renderItem(it: CanvasItem) {
    const base: React.CSSProperties = { width: "100%", height: "100%", boxSizing: "border-box" };
    if (it.kind === "shape") return <div style={{ ...base, background: resolveColor(it.bg, theme, theme.primary), borderRadius: it.radius ?? 0 }} />;
    if (it.kind === "image") {
      return it.imageUrl
        ? // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveImageUrl(it.imageUrl, theme)} alt="" draggable={false} style={{ ...base, objectFit: "cover", borderRadius: it.radius ?? 0, display: "block" }} />
        : <div style={{ ...base, border: "2px dashed #9aa4b2", borderRadius: it.radius ?? 0, display: "grid", placeItems: "center", color: "#667085", font: "600 13px sans-serif", background: "rgba(0,0,0,.04)" }}>Choose an image →</div>;
    }
    const text: React.CSSProperties = { fontFamily: canvasFont(it), fontSize: canvasFontSize(it), fontWeight: it.weight === "bold" ? 700 : 400, lineHeight: 1.25, whiteSpace: "pre-wrap", overflowWrap: "anywhere" };
    if (it.kind === "button") {
      const fill = resolveColor(it.bg, theme, theme.primary);
      return <div style={{ ...base, ...text, background: fill, color: resolveColor(it.color, theme, contrastOn(fill)), borderRadius: it.radius ?? 8, display: "flex", alignItems: "center", justifyContent: it.align === "left" ? "flex-start" : it.align === "right" ? "flex-end" : "center", padding: "0 12px" }}>{it.text}</div>;
    }
    return <div style={{ ...base, ...text, textAlign: it.align ?? "left", color: resolveColor(it.color, theme, contrastOn(bgColor)) }}>{it.text}</div>;
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Free layout designer" className="fixed inset-0 z-[100] flex flex-col bg-surface-secondary" onKeyDown={onKeyDown}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
        <h2 className="mr-2 text-[14px] font-semibold text-text-primary">Free layout</h2>
        {([["text", "Text", Type], ["button", "Button", MousePointerClick], ["image", "Image", ImageIcon], ["shape", "Shape", Shapes]] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" onClick={() => add(k)} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border px-3 text-[12.5px] font-medium text-text-primary hover:bg-surface-secondary"><Icon size={14} /> {label}</button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" aria-label="Undo" onClick={undo} className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary hover:bg-surface-secondary"><Undo2 size={15} /></button>
        <button type="button" aria-label="Redo" onClick={redo} className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary hover:bg-surface-secondary"><Redo2 size={15} /></button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" aria-label="Zoom out" onClick={() => setZoom(clamp(Math.round((scale - 0.1) * 100) / 100, 0.25, 3))} className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary hover:bg-surface-secondary"><Minus size={15} /></button>
        <button type="button" title="Fit to screen" onClick={() => setZoom(null)} className="h-8 min-w-[52px] rounded-[8px] px-2 text-[12.5px] font-medium tabular-nums text-text-primary hover:bg-surface-secondary">{Math.round(scale * 100)}%</button>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom(clamp(Math.round((scale + 0.1) * 100) / 100, 0.25, 3))} className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary hover:bg-surface-secondary"><Plus size={15} /></button>
        <div className="ml-auto flex items-center gap-2">
          {error && <span role="alert" className="max-w-[320px] text-[12px] text-danger">{error}</span>}
          <button type="button" onClick={onClose} disabled={busy} className="inline-flex h-8 items-center gap-1 rounded-[8px] px-3 text-[13px] font-medium text-text-secondary hover:bg-surface-secondary"><X size={14} /> Cancel</button>
          <button type="button" onClick={apply} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle size={14} className="animate-spin" />} Apply</button>
        </div>
      </header>

      {notice && <p className="border-b border-border bg-primary-surface px-4 py-2 text-[12.5px] text-text-secondary">{notice}</p>}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div ref={area} className="min-h-0 flex-1 overflow-auto p-4" onPointerDown={() => setSel(null)} tabIndex={0}>
          <div className="relative mx-auto" style={{ width: W * scale + RULER, height: state.height * scale + RULER }}>
            <Ruler axis="x" length={W} scale={scale} onStart={(e) => startGuide(e, "y", null)} onMove={moveGuide} onEnd={endGuide} />
            <Ruler axis="y" length={state.height} scale={scale} onStart={(e) => startGuide(e, "x", null)} onMove={moveGuide} onEnd={endGuide} />
            <div className="absolute" style={{ left: RULER, top: RULER, width: W * scale, height: state.height * scale }}>
              <div
                ref={stageEl}
                data-stage
                className="relative touch-none select-none overflow-visible shadow-md ring-1 ring-black/10"
                style={{
                  width: W, height: state.height, background: bgColor, transform: `scale(${scale})`, transformOrigin: "top left",
                  ...(gridMode !== "off" ? { backgroundImage: `linear-gradient(to right, rgba(15,23,42,.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,.07) 1px, transparent 1px)`, backgroundSize: `${GRID}px ${GRID}px` } : {}),
                }}
                onPointerMove={onPointerMove} onPointerUp={endGesture} onPointerCancel={endGesture}
              >
                {state.items.map((it, i) => (
                  <div key={i} onPointerDown={(e) => startMove(e, i)} style={{ position: "absolute", left: it.x, top: it.y, width: it.w, height: it.h, cursor: "move" }} className={sel === i ? "" : "hover:outline hover:outline-1 hover:outline-primary/50"}>
                    {renderItem(it)}
                  </div>
                ))}
                {showMargin && margin > 0 && <div className="pointer-events-none absolute border border-dashed border-[#f43f5e]/60" style={{ left: margin, top: margin, right: margin, bottom: margin }} />}
                {guideLines.x.map((g, i) => (
                  <div key={`gx${i}`} onPointerDown={(e) => startGuide(e, "x", i)} onPointerMove={moveGuide} onPointerUp={endGuide} className="absolute top-0 bottom-0 w-2 -translate-x-1/2 cursor-col-resize" style={{ left: g }}>
                    <div className="mx-auto h-full w-px bg-[#06b6d4]" />
                  </div>
                ))}
                {guideLines.y.map((g, i) => (
                  <div key={`gy${i}`} onPointerDown={(e) => startGuide(e, "y", i)} onPointerMove={moveGuide} onPointerUp={endGuide} className="absolute left-0 right-0 h-2 -translate-y-1/2 cursor-row-resize" style={{ top: g }}>
                    <div className="my-auto h-px w-full translate-y-[3px] bg-[#06b6d4]" />
                  </div>
                ))}
                {item && sel !== null && (
                  <>
                    <div className="pointer-events-none absolute" style={{ left: item.x, top: item.y, width: item.w, height: item.h, outline: `${1.5 / scale}px solid #0B5FFF` }}>
                      {HANDLES.map((h) => (
                        <span key={h.dir} onPointerDown={(e) => startResize(e, h.dir)} className="pointer-events-auto absolute rounded-full border-2 border-primary bg-white" style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: 12 / scale, height: 12 / scale, borderWidth: 2 / scale, transform: "translate(-50%, -50%)", cursor: h.cursor }} />
                      ))}
                    </div>
                    <div className="pointer-events-none absolute whitespace-nowrap rounded-[5px] bg-[#0B5FFF] px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ left: item.x + item.w / 2, top: item.y + item.h + 10 / scale, transform: `translateX(-50%) scale(${1 / scale})`, transformOrigin: "top center" }}>
                      {Math.round(item.w)} × {Math.round(item.h)}
                    </div>
                  </>
                )}
                {guides.x !== undefined && <div className="pointer-events-none absolute top-0 bottom-0 bg-[#f43f5e]" style={{ left: guides.x, width: 1 / scale }} />}
                {guides.y !== undefined && <div className="pointer-events-none absolute left-0 right-0 bg-[#f43f5e]" style={{ top: guides.y, height: 1 / scale }} />}
              </div>
            </div>
          </div>
          <p className="mx-auto mt-3 max-w-[600px] text-center text-[11.5px] text-text-tertiary">Drag to move, drag the dots to resize (Shift keeps the shape). Drag from a ruler to add a guide. Arrow keys nudge, Delete removes, Alt turns snapping off, Ctrl + scroll zooms.</p>
        </div>

        <aside className="max-h-[45vh] w-full shrink-0 overflow-y-auto border-t border-border bg-surface p-4 md:max-h-none md:w-[300px] md:border-l md:border-t-0">
          {item && sel !== null ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold capitalize text-text-primary">{item.kind}</p>
                <div className="flex gap-0.5">
                  <button type="button" title="Bring forward" aria-label="Bring forward" onClick={() => reorder(sel, sel + 1)} className="grid h-7 w-7 place-items-center rounded-[6px] text-text-tertiary hover:bg-surface-secondary"><ArrowUp size={14} /></button>
                  <button type="button" title="Send back" aria-label="Send back" onClick={() => reorder(sel, sel - 1)} className="grid h-7 w-7 place-items-center rounded-[6px] text-text-tertiary hover:bg-surface-secondary"><ArrowDown size={14} /></button>
                  <button type="button" title="Duplicate" aria-label="Duplicate" onClick={() => duplicate(sel)} className="grid h-7 w-7 place-items-center rounded-[6px] text-text-tertiary hover:bg-surface-secondary"><Copy size={14} /></button>
                  <button type="button" title="Delete" aria-label="Delete" onClick={() => remove(sel)} className="grid h-7 w-7 place-items-center rounded-[6px] text-text-tertiary hover:bg-danger-surface hover:text-danger"><Trash2 size={14} /></button>
                </div>
              </div>
              {(item.kind === "text" || item.kind === "button") && (
                <Field label={item.kind === "button" ? "Label" : "Text"}>
                  <textarea className={`${input} h-auto min-h-[72px] py-2`} value={item.text ?? ""} maxLength={600} onChange={(e) => patchItem(sel, { text: e.target.value })} />
                </Field>
              )}
              {item.kind === "image" && (
                <ImageField id={`designer-img-${sel}`} value={item.imageUrl ?? ""} theme={theme} scope={scope} onChange={(v) => patchItem(sel, { imageUrl: v }, null)} />
              )}
              {(item.kind === "button" || item.kind === "image" || item.kind === "text") && (
                <Field label="Link (optional)">
                  <input className={input} placeholder="https://" value={item.url ?? ""} onChange={(e) => patchItem(sel, { url: e.target.value })} />
                </Field>
              )}
              <div className="flex gap-1" role="group" aria-label="Align to the design">
                {([["left", "Align left", AlignHorizontalJustifyStart], ["hcenter", "Center horizontally", AlignHorizontalJustifyCenter], ["right", "Align right", AlignHorizontalJustifyEnd], ["top", "Align top", AlignVerticalJustifyStart], ["vmiddle", "Center vertically", AlignVerticalJustifyCenter], ["bottom", "Align bottom", AlignVerticalJustifyEnd]] as const).map(([k, label, Icon]) => (
                  <button key={k} type="button" title={label} aria-label={label} onClick={() => alignItem(k)} className="grid h-8 flex-1 place-items-center rounded-[8px] border border-border text-text-secondary hover:bg-surface-secondary"><Icon size={15} /></button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Num label="X" value={item.x} min={-300} max={900} onChange={(n) => patchItem(sel, { x: n })} />
                <Num label="Y" value={item.y} min={-300} max={1700} onChange={(n) => patchItem(sel, { y: n })} />
                <Num label="Width" value={item.w} min={8} max={1200} onChange={(n) => patchItem(sel, { w: n })} />
                <Num label="Height" value={item.h} min={8} max={1700} onChange={(n) => patchItem(sel, { h: n })} />
              </div>
              {(item.kind === "text" || item.kind === "button") && (
                <>
                  <Num label="Font size" value={canvasFontSize(item)} min={8} max={160} onChange={(n) => patchItem(sel, { fontSize: n })} />
                  <Seg value={item.weight ?? "normal"} options={[{ value: "normal", label: "Regular" }, { value: "bold", label: "Bold" }]} onChange={(v) => patchItem(sel, { weight: v })} />
                  <Seg value={item.align ?? (item.kind === "button" ? "center" : "left")} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} onChange={(v) => patchItem(sel, { align: v })} />
                  <Seg value={item.font ?? "sans"} options={[{ value: "sans", label: "Sans" }, { value: "serif", label: "Serif" }, { value: "mono", label: "Mono" }]} onChange={(v) => patchItem(sel, { font: v })} />
                  <Field label="Text colour"><ColorField id={`designer-color-${sel}`} value={item.color ?? ""} theme={theme} onChange={(v) => patchItem(sel, { color: v || undefined })} /></Field>
                </>
              )}
              {(item.kind === "button" || item.kind === "shape") && (
                <Field label="Fill colour"><ColorField id={`designer-bg-${sel}`} value={item.bg ?? ""} theme={theme} onChange={(v) => patchItem(sel, { bg: v || undefined })} /></Field>
              )}
              {item.kind !== "text" && <Num label="Corner radius" value={item.radius ?? 0} min={0} max={600} onChange={(n) => patchItem(sel, { radius: n })} />}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-text-primary">Design</p>
              <Num label="Height (px)" value={state.height} min={80} max={1600} onChange={(n) => commit({ ...stateRef.current, height: n }, "height")} />
              <Num label="Margin (px)" value={margin} min={0} max={120} onChange={setMargin} />
              <Seg value={showMargin ? "show" : "hide"} options={[{ value: "show", label: "Show margins" }, { value: "hide", label: "Hide" }]} onChange={(v) => setShowMargin(v === "show")} />
              <Field label="Grid">
                <Seg value={gridMode} options={[{ value: "off", label: "Off" }, { value: "show", label: "Show" }, { value: "snap", label: "Snap" }]} onChange={setGridMode} />
              </Field>
              {(guideLines.x.length > 0 || guideLines.y.length > 0) && (
                <button type="button" onClick={() => setGuides2({ x: [], y: [] })} className="text-[12px] font-medium text-primary hover:underline">Clear {guideLines.x.length + guideLines.y.length} guides</button>
              )}
              <Field label="Background"><ColorField id="designer-canvas-bg" value={state.bg} theme={theme} onChange={(v) => commit({ ...stateRef.current, bg: v }, "bg")} /></Field>
              {scope.kind !== "landing" && (
                <Field label="Link for the whole design (emails)">
                  <input className={input} placeholder="https://" value={state.link} onChange={(e) => commit({ ...stateRef.current, link: e.target.value }, "link")} />
                </Field>
              )}
              <p className="text-[12px] leading-relaxed text-text-tertiary">{scope.kind === "landing" ? "On a landing page every element keeps its own link and the text stays real text." : "In emails this design is sent as one picture, so it looks the same in Gmail and Outlook. Add one link for the whole picture."} Click an element to edit it.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
