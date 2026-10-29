"use client";

import type { EmailTheme } from "@/db/schema";
import { FONT_OPTIONS, THEME_PRESETS } from "@/lib/email-builder/theme";
import { FieldRow } from "./fields";

const COLORS: { key: keyof EmailTheme; label: string }[] = [
  { key: "primary", label: "Primary" }, { key: "secondary", label: "Secondary" }, { key: "accent", label: "Accent" },
  { key: "text", label: "Text" }, { key: "surface", label: "Email" }, { key: "bg", label: "Page" },
];
const select = "w-full rounded-[8px] border border-border bg-surface px-2.5 py-[7px] text-[13px] text-text-primary outline-none hover:border-border-strong focus:border-primary focus:shadow-[var(--shadow-focus-primary)]";

export function ThemeTab({ theme, onChange, onPreset }: { theme: EmailTheme; onChange: (patch: Partial<EmailTheme>) => void; onPreset: (t: EmailTheme) => void }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">Presets</h3>
        <div className="grid grid-cols-2 gap-2">
          {THEME_PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => onPreset(p.theme)} className="rounded-[10px] border border-border bg-surface p-2 text-left transition-[border-color,box-shadow] hover:border-primary/50 hover:shadow-[var(--shadow-sm)]">
              <span className="mb-1.5 flex h-5 overflow-hidden rounded-[5px] border border-black/5">
                {[p.theme.primary, p.theme.secondary, p.theme.accent, p.theme.surface].map((c, i) => (<span key={i} className="flex-1" style={{ background: c }} />))}
              </span>
              <span className="text-[12px] font-medium text-text-primary">{p.name}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">Colours</h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {COLORS.map(({ key, label }) => (
            <FieldRow key={key} label={label} htmlFor={`theme-${key}`}>
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-surface px-2 hover:border-border-strong">
                <input id={`theme-${key}`} type="color" value={String(theme[key])} onChange={(e) => onChange({ [key]: e.target.value.toUpperCase() })} className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0" />
                <span className="font-mono text-[12px] text-text-secondary">{String(theme[key]).toUpperCase()}</span>
              </label>
            </FieldRow>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">Typography & buttons</h3>
        <FieldRow label="Headings" htmlFor="theme-headingFont">
          <select id="theme-headingFont" className={select} value={theme.headingFont} onChange={(e) => onChange({ headingFont: e.target.value as EmailTheme["headingFont"] })}>{FONT_OPTIONS.map((f) => (<option key={f.key} value={f.key}>{f.label}</option>))}</select>
        </FieldRow>
        <FieldRow label="Body text" htmlFor="theme-bodyFont">
          <select id="theme-bodyFont" className={select} value={theme.bodyFont} onChange={(e) => onChange({ bodyFont: e.target.value as EmailTheme["bodyFont"] })}>{FONT_OPTIONS.map((f) => (<option key={f.key} value={f.key}>{f.label}</option>))}</select>
        </FieldRow>
        <FieldRow label="Button shape">
          <div className="flex gap-1" role="group" aria-label="Button shape">
            {(["rounded", "pill", "square"] as const).map((b) => (
              <button key={b} type="button" aria-pressed={theme.button === b} onClick={() => onChange({ button: b })} className={`h-8 flex-1 rounded-[8px] border text-[12.5px] font-medium capitalize ${theme.button === b ? "border-primary bg-primary-surface text-primary" : "border-border bg-surface text-text-secondary hover:border-border-strong"}`}>{b}</button>
            ))}
          </div>
        </FieldRow>
      </section>
    </div>
  );
}
