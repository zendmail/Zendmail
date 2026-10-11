"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, Monitor, Smartphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const htmlCache = new Map<string, Promise<string>>();

/** Fetches (and caches for the session) the rendered HTML of a template. */
function loadTemplateHtml(id: string): Promise<string> {
  let pending = htmlCache.get(id);
  if (!pending) {
    pending = fetch(`/api/templates/${id}/preview`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("preview failed"))))
      .then((json: { html: string }) => json.html)
      .catch((error) => {
        htmlCache.delete(id);
        throw error;
      });
    htmlCache.set(id, pending);
  }
  return pending;
}

function useTemplateHtml(id: string, enabled: boolean) {
  const [html, setHtml] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadTemplateHtml(id)
      .then((h) => !cancelled && setHtml(h))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [id, enabled]);
  return { html, failed };
}

/** A scaled-down live render of the template, loaded only when it scrolls into view. */
export function TemplateThumb({ id, name, height = 340 }: { id: string; name: string; height?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  const [scale, setScale] = React.useState(0.4);
  const { html, failed } = useTemplateHtml(id, visible);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && (setVisible(true), observer.disconnect()),
      { rootMargin: "300px" }
    );
    observer.observe(el);
    const resize = new ResizeObserver(() => setScale(el.clientWidth / 640));
    resize.observe(el);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-surface-secondary" style={{ height }}>
      {html ? (
        <iframe
          title={`${name} preview`}
          srcDoc={html}
          sandbox=""
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
          style={{ width: 640, height: Math.ceil(height / scale) + 40, transform: `scale(${scale})`, transformOrigin: "top left" }}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[12px] text-text-tertiary">
          {failed ? "Preview unavailable" : <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Loading preview" />}
        </div>
      )}
    </div>
  );
}


/**
 * Preview iframe that grows to the email's real height. `allow-same-origin` is needed to measure the
 * document; it is safe here because the sandbox still has no `allow-scripts`, so nothing in the email can run.
 */
function AutoHeightFrame({ html, title }: { html: string; title: string }) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = React.useState(900);

  const measure = React.useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (doc?.documentElement) setHeight(Math.max(400, doc.documentElement.scrollHeight));
  }, []);

  React.useEffect(() => {
    // Images (illustrations) arrive after the first paint, so re-measure for a few seconds.
    const timers = [200, 800, 1800, 3500, 7000].map((ms) => window.setTimeout(measure, ms));
    return () => timers.forEach(window.clearTimeout);
  }, [html, measure]);

  return <iframe ref={ref} title={title} srcDoc={html} sandbox="allow-same-origin" onLoad={measure} className="block w-full rounded-[12px] border-0 bg-white shadow-[var(--shadow-md)]" style={{ height }} />;
}

/** Full-size preview with a Desktop / Mobile switch. */
export function TemplateModal({
  id,
  name,
  description,
  tier,
  subject,
  onClose,
  footer,
}: {
  id: string;
  name: string;
  description: string | null;
  tier: "FREE" | "PRO";
  subject: string | null;
  onClose: () => void;
  footer: React.ReactNode;
}) {
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const { html, failed } = useTemplateHtml(id, true);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const width = device === "desktop" ? 660 : 390;

  // Rendered into <body>: an ancestor with a CSS transform (the page-transition animation) would otherwise
  // become the containing block for `fixed` and clip the dialog to the content column.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#071B44]/70 p-0 backdrop-blur-sm sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={`${name} preview`} className="flex h-full w-full max-w-[1000px] flex-col overflow-hidden bg-surface shadow-[var(--shadow-lg)] sm:h-[min(900px,94vh)] sm:rounded-[20px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[16px] font-bold text-text-primary">{name}</h2>
              <Badge tone={tier === "PRO" ? "primary" : "success"}>{tier === "PRO" ? "Pro" : "Free"}</Badge>
            </div>
            {subject && <p className="mt-0.5 truncate text-[12px] text-text-secondary">Subject: {subject.replace(/\{\{\s*business_name\s*\}\}/g, "Your brand")}</p>}
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-[10px] border border-border p-0.5" role="group" aria-label="Preview device">
              {([["desktop", Monitor, "Desktop"], ["mobile", Smartphone, "Mobile"]] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={device === value}
                  onClick={() => setDevice(value)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[12.5px] font-semibold ${device === value ? "bg-primary text-white" : "text-text-secondary hover:bg-surface-secondary"}`}
                >
                  <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close preview" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-text-secondary hover:bg-surface-secondary">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#E7ECF4] p-3 sm:p-6">
          <div className="mx-auto transition-[width] duration-200" style={{ width: `min(${width}px, 100%)` }}>
            {html ? (
              <AutoHeightFrame html={html} title={`${name} full preview`} />
            ) : (
              <div className="flex h-64 items-center justify-center text-[13px] text-text-secondary">{failed ? "Preview unavailable." : "Loading preview…"}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="flex items-center gap-1.5 text-[12.5px] text-text-secondary">
            <Check size={14} className="text-success" />
            {description ?? "Fully editable — change text, images, colours and fonts."}
          </p>
          {footer}
        </div>
      </div>
    </div>,
    document.body
  );
}
