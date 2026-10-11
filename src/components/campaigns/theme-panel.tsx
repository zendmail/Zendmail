"use client";

import * as React from "react";
import { useTransition } from "react";
import { Palette } from "lucide-react";
import type { EmailTheme } from "@/db/schema";
import { updateThemeAction } from "@/lib/actions/campaign-actions";
import { FONT_OPTIONS, THEME_PRESETS } from "@/lib/email-builder/theme";

const COLOR_FIELDS: { key: keyof EmailTheme; label: string }[] = [
  { key: "primary", label: "Primary (buttons, accents)" },
  { key: "secondary", label: "Secondary (dark areas)" },
  { key: "accent", label: "Accent" },
  { key: "text", label: "Text" },
  { key: "surface", label: "Email background" },
  { key: "bg", label: "Page background" },
];

const selectClass = "w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1.5 text-[13px] text-text-primary outline-none focus:border-primary";

/** Brand colours, fonts and button shape for the whole email. Saves as you change them. */
export function ThemePanel({ campaignId, theme }: { campaignId: string; theme: EmailTheme }) {
  const [draft, setDraft] = React.useState<EmailTheme>(theme);
  const [seen, setSeen] = React.useState(JSON.stringify(theme));
  const [pending, startTransition] = useTransition();
  const timer = React.useRef<number | null>(null);

  // Adopt a theme that changed on the server (e.g. a different template was applied) — adjusting state while
  // rendering is React's recommended alternative to syncing props into state with an effect.
  const incoming = JSON.stringify(theme);
  if (incoming !== seen) {
    setSeen(incoming);
    setDraft(theme);
  }

  function commit(next: EmailTheme) {
    setDraft(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const fd = new FormData();
      fd.set("campaignId", campaignId);
      Object.entries(next).forEach(([k, v]) => fd.set(k, String(v)));
      startTransition(() => { updateThemeAction(fd); });
    }, 350);
  }

  return (
    <details className="group rounded-[var(--radius-md)] border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-text-primary">
          <Palette size={16} className="text-primary" /> Brand colours &amp; fonts
          <span className="flex gap-1" aria-hidden="true">
            {[draft.primary, draft.secondary, draft.accent].map((c, i) => (<span key={i} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />))}
          </span>
        </span>
        <span className="text-[12px] font-semibold text-primary">{pending ? "Saving…" : "Customise"}</span>
      </summary>
      <div className="space-y-4 border-t border-border p-3.5">
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold text-text-secondary">Quick palettes</p>
          <div className="flex flex-wrap gap-1.5">
            {THEME_PRESETS.map((p) => (
              <button key={p.name} type="button" onClick={() => commit({ ...draft, primary: p.theme.primary, secondary: p.theme.secondary, accent: p.theme.accent, bg: p.theme.bg, text: p.theme.text, muted: p.theme.muted })} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold text-text-primary hover:border-primary">
                <span className="flex" aria-hidden="true">{[p.theme.primary, p.theme.secondary, p.theme.accent].map((c, i) => (<span key={i} className="-ml-1 h-3.5 w-3.5 rounded-full border border-white first:ml-0" style={{ background: c }} />))}</span>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {COLOR_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-text-primary">
              <input type="color" value={String(draft[f.key])} onChange={(e) => commit({ ...draft, [f.key]: e.target.value.toUpperCase() })} className="h-7 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={f.label} />
              <span className="min-w-0 flex-1 truncate">{f.label}</span>
              <span className="font-mono text-[11px] text-text-tertiary">{String(draft[f.key])}</span>
            </label>
          ))}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <label className="text-[11.5px] font-semibold text-text-secondary">Heading font
            <select className={`${selectClass} mt-1 font-normal`} value={draft.headingFont} onChange={(e) => commit({ ...draft, headingFont: e.target.value as EmailTheme["headingFont"] })}>
              {FONT_OPTIONS.map((f) => (<option key={f.key} value={f.key}>{f.label}</option>))}
            </select>
          </label>
          <label className="text-[11.5px] font-semibold text-text-secondary">Body font
            <select className={`${selectClass} mt-1 font-normal`} value={draft.bodyFont} onChange={(e) => commit({ ...draft, bodyFont: e.target.value as EmailTheme["bodyFont"] })}>
              {FONT_OPTIONS.map((f) => (<option key={f.key} value={f.key}>{f.label}</option>))}
            </select>
          </label>
          <label className="text-[11.5px] font-semibold text-text-secondary">Buttons
            <select className={`${selectClass} mt-1 font-normal`} value={draft.button} onChange={(e) => commit({ ...draft, button: e.target.value as EmailTheme["button"] })}>
              <option value="rounded">Rounded</option><option value="pill">Pill</option><option value="square">Square</option>
            </select>
          </label>
        </div>
        <p className="text-[11.5px] text-text-tertiary">Fonts other than Helvetica/Arial and Georgia show in Apple Mail and most phones; Gmail and Outlook use a close fallback.</p>
      </div>
    </details>
  );
}
