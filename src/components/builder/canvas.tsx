"use client";

import * as React from "react";
import { renderEmailHtml } from "@/lib/email-builder/render";
import type { EmailDocument } from "@/lib/email-builder/document";

export type CanvasMessage =
  | { zm: "ready" }
  | { zm: "select"; id: string | null }
  | { zm: "action"; action: "up" | "down" | "duplicate" | "remove"; id: string | null }
  | { zm: "history"; dir: "undo" | "redo" }
  | { zm: "scroll"; y: number };

/**
 * The live preview. The email is rendered in the browser by the same renderer that builds the sent email and shown in a
 * sandboxed iframe (scripts only, no same-origin). Updates are posted into the frame as HTML patches, so typing never
 * reloads it: no flash and the scroll position stays put.
 */
export function Canvas({ doc, selectedId, scrollTarget, device, onMessage }: {
  doc: EmailDocument; selectedId: string | null; scrollTarget: { id: string; n: number } | null; device: "desktop" | "mobile"; onMessage: (m: CanvasMessage) => void;
}) {
  const frame = React.useRef<HTMLIFrameElement>(null);
  const ready = React.useRef(false);
  const scrollY = React.useRef(0);
  const latest = React.useRef({ doc, selectedId });
  const [srcDoc, setSrcDoc] = React.useState<string | null>(null);

  const html = React.useCallback((d: EmailDocument) => renderEmailHtml(d.blocks, { theme: d.theme, editor: { baseUrl: window.location.origin } }), []);
  const post = React.useCallback((m: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(m, "*"), []);

  React.useEffect(() => {
    latest.current = { doc, selectedId };
  });

  // First paint only: later changes are patched in.
  React.useEffect(() => {
    setSrcDoc(html(latest.current.doc));
  }, [html]);

  React.useEffect(() => {
    function handle(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow) return;
      const m = e.data as CanvasMessage | undefined;
      if (!m || typeof m !== "object" || !("zm" in m)) return;
      if (m.zm === "ready") {
        ready.current = true;
        post({ zm: "patch", html: html(latest.current.doc) });
        post({ zm: "restore", y: scrollY.current, id: latest.current.selectedId });
      } else if (m.zm === "scroll") {
        scrollY.current = m.y;
      } else {
        onMessage(m);
      }
    }
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [html, onMessage, post]);

  React.useEffect(() => {
    if (!ready.current) return;
    const t = window.setTimeout(() => post({ zm: "patch", html: html(doc) }), 40);
    return () => window.clearTimeout(t);
  }, [doc, html, post]);

  React.useEffect(() => {
    if (ready.current) post({ zm: "select", id: selectedId });
  }, [selectedId, post]);

  React.useEffect(() => {
    if (scrollTarget && ready.current) post({ zm: "scrollTo", id: scrollTarget.id });
  }, [scrollTarget, post]);

  return (
    <div className="flex h-full justify-center overflow-hidden px-4 pt-5 sm:px-8">
      <div className="h-full transition-[width] duration-300 ease-out" style={{ width: device === "desktop" ? 680 : 392, maxWidth: "100%" }}>
        <div className={`h-full overflow-hidden border border-border bg-white shadow-[var(--shadow-lg)] ${device === "mobile" ? "rounded-t-[28px] border-[6px] border-b-0 border-[#1B2333]" : "rounded-t-[14px]"}`}>
          {srcDoc !== null && <iframe ref={frame} title="Email preview" srcDoc={srcDoc} sandbox="allow-scripts" className="block h-full w-full border-0 bg-white" />}
        </div>
      </div>
    </div>
  );
}
