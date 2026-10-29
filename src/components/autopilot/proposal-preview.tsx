"use client";

import * as React from "react";

/** A scaled-down, non-interactive render of the proposed email (sandboxed, no scripts). */
export function ProposalPreview({ html, title }: { html: string; title: string }) {
  const box = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.4);
  React.useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 640);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative h-[360px] w-full overflow-hidden rounded-[12px] border border-border bg-[#E9EDF4]">
      <iframe title={`Preview: ${title}`} srcDoc={html} sandbox="" tabIndex={-1} loading="lazy" className="pointer-events-none absolute left-0 top-0 border-0" style={{ width: 640, height: 360 / Math.max(scale, 0.1), transform: `scale(${scale})`, transformOrigin: "top left" }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#E9EDF4] to-transparent" />
    </div>
  );
}
