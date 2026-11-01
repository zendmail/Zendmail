"use client";

import * as React from "react";
import { LoaderCircle, X } from "lucide-react";
import { uploadCampaignImage } from "@/components/campaigns/upload-image";

type Box = { x: number; y: number; w: number; h: number }; // fractions of the image (0..1)
type Drag = { mode: "move" | "nw" | "ne" | "sw" | "se"; px: number; py: number; box: Box };

const RATIOS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
];

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** Crops an already-uploaded picture in the browser and uploads the result, so the crop works in every email client. */
export function CropDialog({ src, scope, onDone, onClose }: { src: string; scope: { kind: "campaign" | "template" | "landing"; id: string }; onDone: (url: string) => void; onClose: () => void }) {
  const stage = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = React.useState<Box>({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  const [ratio, setRatio] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const drag = React.useRef<Drag | null>(null);

  // The picture may finish loading before React attaches onLoad (cached images), so check once on mount.
  React.useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // Keep the crop box on the requested aspect ratio (measured in real pixels).
  const fit = React.useCallback((b: Box, r: number | null): Box => {
    if (!natural || r === null) return b;
    let w = b.w, h = (b.w * natural.w) / natural.h / r;
    if (h > 1) { h = 1; w = (h * natural.h * r) / natural.w; }
    return { x: clamp(b.x, 0, 1 - w), y: clamp(b.y, 0, 1 - h), w, h };
  }, [natural]);

  function pick(r: number | null) { setRatio(r); setBox((b) => fit(b, r)); }

  function start(mode: Drag["mode"], e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, px: e.clientX, py: e.clientY, box };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current, el = stage.current;
    if (!d || !el || !natural) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - d.px) / r.width, dy = (e.clientY - d.py) / r.height;
    const b = d.box;
    if (d.mode === "move") { setBox({ ...b, x: clamp(b.x + dx, 0, 1 - b.w), y: clamp(b.y + dy, 0, 1 - b.h) }); return; }
    let x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
    if (d.mode === "nw" || d.mode === "sw") x1 = clamp(x1 + dx, 0, x2 - 0.05); else x2 = clamp(x2 + dx, x1 + 0.05, 1);
    if (d.mode === "nw" || d.mode === "ne") y1 = clamp(y1 + dy, 0, y2 - 0.05); else y2 = clamp(y2 + dy, y1 + 0.05, 1);
    let next: Box = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    if (ratio !== null) {
      const h = (next.w * natural.w) / natural.h / ratio;
      const anchorTop = d.mode === "sw" || d.mode === "se";
      const ny = anchorTop ? next.y : next.y + next.h - h;
      next = { x: next.x, y: ny, w: next.w, h };
      if (next.y < 0 || next.y + next.h > 1) return;
    }
    setBox(next);
  }
  function end() { drag.current = null; }

  async function apply() {
    const img = imgRef.current;
    if (!img || !natural) return;
    setBusy(true); setError("");
    try {
      const sw = Math.max(1, Math.round(box.w * natural.w)), sh = Math.max(1, Math.round(box.h * natural.h));
      const canvas = document.createElement("canvas");
      canvas.width = sw; canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Cropping isn't supported in this browser.");
      ctx.drawImage(img, Math.round(box.x * natural.w), Math.round(box.y * natural.h), sw, sh, 0, 0, sw, sh);
      const png = /\.png(\?|$)/i.test(src);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, png ? "image/png" : "image/jpeg", 0.92));
      if (!blob) throw new Error("Couldn't crop this image. Try uploading it again.");
      const file = new File([blob], png ? "crop.png" : "crop.jpg", { type: blob.type });
      onDone(await uploadCampaignImage(scope.id, file, scope.kind));
    } catch (err) {
      setError(err instanceof DOMException || (err instanceof Error && /tainted|insecure/i.test(err.message)) ? "This image can't be cropped here. Upload it again, then crop." : err instanceof Error ? err.message : "Crop failed.");
      setBusy(false);
    }
  }

  const handle = "absolute h-3.5 w-3.5 rounded-full border-2 border-primary bg-white";
  return (
    <div role="dialog" aria-modal="true" aria-label="Crop image" className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="w-full max-w-[560px] rounded-[14px] bg-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-text-primary">Crop image</h2>
          <button type="button" aria-label="Close" onClick={onClose} disabled={busy} className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary hover:bg-surface-secondary"><X size={16} /></button>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {RATIOS.map((r) => (
            <button key={r.label} type="button" aria-pressed={ratio === r.value} onClick={() => pick(r.value)} className={`h-7 rounded-[7px] border px-2.5 text-[12px] font-medium ${ratio === r.value ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:bg-surface-secondary"}`}>{r.label}</button>
          ))}
        </div>
        <div className="flex justify-center rounded-[10px] bg-surface-secondary p-2">
          <div ref={stage} className="relative inline-block max-w-full touch-none select-none overflow-hidden" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt="" crossOrigin="anonymous" draggable={false} className="block max-h-[360px] max-w-full" onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} onError={() => setError("Couldn't load this image for cropping.")} />
            {natural && (
              <div className="absolute cursor-move border-2 border-primary" onPointerDown={(e) => start("move", e)} style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%`, boxShadow: "0 0 0 9999px rgba(0,0,0,.5)" }}>
                <span className={`${handle} left-1 top-1 cursor-nwse-resize`} onPointerDown={(e) => start("nw", e)} />
                <span className={`${handle} right-1 top-1 cursor-nesw-resize`} onPointerDown={(e) => start("ne", e)} />
                <span className={`${handle} bottom-1 left-1 cursor-nesw-resize`} onPointerDown={(e) => start("sw", e)} />
                <span className={`${handle} bottom-1 right-1 cursor-nwse-resize`} onPointerDown={(e) => start("se", e)} />
              </div>
            )}
          </div>
        </div>
        {error && <p role="alert" className="mt-2 text-[12px] text-danger">{error}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-9 rounded-[8px] px-3 text-[13px] font-medium text-text-secondary hover:bg-surface-secondary">Cancel</button>
          <button type="button" onClick={apply} disabled={busy || !natural} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle size={14} className="animate-spin" />} Apply crop</button>
        </div>
      </div>
    </div>
  );
}
