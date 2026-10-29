"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Bold, ImageUp, Italic, Link2, LoaderCircle, Plus, Trash2 } from "lucide-react";
import type { EmailBlock, EmailTheme } from "@/db/schema";
import type { FieldDef } from "@/lib/email-builder/schema";
import type { ItemOp } from "@/lib/email-builder/schema";
import { ART_NAMES, resolveImageUrl } from "@/lib/email-builder/assets";
import { COLOR_TOKENS, TOKEN_LABELS, isToken, normalizeHex, resolveColor, resolveToken } from "@/lib/email-builder/theme";
import { uploadCampaignImage } from "@/components/campaigns/upload-image";

type Textish = Exclude<FieldDef, { kind: "number" } | { kind: "toggle" } | { kind: "select" } | { kind: "items" }>;

export type UploadScope = { kind: "campaign" | "template"; id: string };

const input =
  "w-full rounded-[8px] border border-border bg-surface px-2.5 py-[7px] text-[13px] leading-5 text-text-primary outline-none transition-shadow placeholder:text-text-placeholder hover:border-border-strong focus:border-primary focus:shadow-[var(--shadow-focus-primary)]";

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined), source);
}

/** Local draft for text inputs: the store trims/validates, so the input keeps what the user typed (e.g. a trailing space). */
function useDraft(value: string, emit: (v: string) => void): [string, (v: string) => void] {
  const [draft, setDraft] = React.useState(value);
  const [seen, setSeen] = React.useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== draft.trim() && value !== draft) setDraft(value);
  }
  return [draft, (v) => { setDraft(v); emit(v); }];
}

export function FieldRow({ label, help, htmlFor, children }: { label: string; help?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[12px] font-medium text-text-secondary">{label}</label>
      {children}
      {help && <p className="mt-1.5 text-[11.5px] leading-snug text-text-tertiary">{help}</p>}
    </div>
  );
}

function TextField({ id, def, value, onChange }: { id: string; def: Textish; value: string; onChange: (v: string) => void }) {
  const [draft, set] = useDraft(value, onChange);
  return <input id={id} className={input} value={draft} maxLength={def.kind === "text" ? def.max ?? 200 : 1000} placeholder={def.kind === "url" ? "https://…" : def.placeholder} onChange={(e) => set(e.target.value)} />;
}

const RICH_TOOLS = [
  ["Bold", Bold, "<strong>", "</strong>", "bold"],
  ["Italic", Italic, "<em>", "</em>", "italic"],
  ["Link", Link2, '<a href="https://">', "</a>", "link"],
] as const;

function TextArea({ id, def, value, onChange, rich }: { id: string; def: Textish; value: string; onChange: (v: string) => void; rich: boolean }) {
  const [draft, set] = useDraft(value, onChange);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  function wrap(open: string, close: string, fallback: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const selected = draft.slice(a, b) || fallback;
    set(`${draft.slice(0, a)}${open}${selected}${close}${draft.slice(b)}`);
  }
  return (
    <div>
      {rich && (
        <div className="mb-1 flex gap-1">
          {RICH_TOOLS.map(([label, Icon, open, close, fallback]) => (
            <button key={label} type="button" title={label} aria-label={label} onClick={() => wrap(open, close, fallback)} className="grid h-7 w-7 place-items-center rounded-[6px] border border-border bg-surface text-text-secondary hover:bg-surface-secondary hover:text-text-primary"><Icon size={13} /></button>
          ))}
        </div>
      )}
      <textarea ref={ref} id={id} className={`${input} min-h-[76px] resize-y font-[inherit] ${rich ? "font-mono text-[12px]" : ""}`} rows={rich ? 8 : 3} value={draft} maxLength={def.max ?? 1000} onChange={(e) => set(e.target.value)} />
    </div>
  );
}

function ColorField({ id, value, theme, onChange }: { id: string; value: string; theme: EmailTheme; onChange: (v: string) => void }) {
  const custom = value !== "" && !isToken(value);
  const hex = normalizeHex(value) ?? "#0B5FFF";
  const tokens = COLOR_TOKENS.filter((t) => !t.startsWith("on"));
  const current = value ? (isToken(value) ? TOKEN_LABELS[value.slice(1) as keyof typeof TOKEN_LABELS] : value.toUpperCase()) : "Template default";
  return (
    <div id={id}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" title="Template default" aria-label="Template default" aria-pressed={value === ""} onClick={() => onChange("")} className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] text-text-tertiary ${value === "" ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-border-strong"}`} style={{ background: "repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 8px 8px" }} />
        {tokens.map((t) => (
          <button key={t} type="button" title={TOKEN_LABELS[t]} aria-label={TOKEN_LABELS[t]} aria-pressed={value === `@${t}`} onClick={() => onChange(`@${t}`)} className={`h-6 w-6 rounded-full border ${value === `@${t}` ? "border-primary ring-2 ring-primary/25" : "border-black/10 hover:scale-110"} transition-transform`} style={{ background: resolveToken(t, theme) }} />
        ))}
        <label title="Custom colour" className={`relative grid h-6 w-6 cursor-pointer place-items-center overflow-hidden rounded-full border ${custom ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-border-strong"}`} style={{ background: custom ? resolveColor(value, theme, hex) : "conic-gradient(#f43f5e,#f59e0b,#10b981,#3b82f6,#8b5cf6,#f43f5e)" }}>
          <input type="color" aria-label="Custom colour" value={hex} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
      </div>
      <p className="mt-1.5 text-[11.5px] text-text-tertiary">{current}</p>
    </div>
  );
}

function ImageField({ id, value, theme, scope, onChange }: { id: string; value: string; theme: EmailTheme; scope: UploadScope; onChange: (v: string) => void }) {
  const file = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [url, setUrl] = useDraft(value.startsWith("asset:") ? "" : value, onChange);
  const isArt = value.startsWith("asset:art");
  const artName = isArt ? new URLSearchParams(value.split("?")[1]).get("name") ?? "" : "";
  const preview = value ? resolveImageUrl(value, theme) : "";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-border bg-surface-secondary" style={{ backgroundImage: "repeating-conic-gradient(#eef1f6 0% 25%, #fff 0% 50%)", backgroundSize: "10px 10px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImageUp size={16} className="text-text-tertiary" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" aria-label="Upload an image" onChange={async (e) => {
            const f = e.currentTarget.files?.[0]; e.currentTarget.value = "";
            if (!f) return;
            setBusy(true); setError("");
            try { onChange(await uploadCampaignImage(scope.id, f, scope.kind)); } catch (err) { setError(err instanceof Error ? err.message : "Upload failed."); } finally { setBusy(false); }
          }} />
          <button type="button" disabled={busy} onClick={() => file.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-2.5 text-[12.5px] font-medium text-text-primary hover:bg-surface-secondary disabled:opacity-60">
            {busy ? <LoaderCircle size={13} className="animate-spin" /> : <ImageUp size={13} />} Upload
          </button>
          {value && <button type="button" onClick={() => onChange("")} className="inline-flex h-8 items-center rounded-[8px] px-2.5 text-[12.5px] font-medium text-text-secondary hover:bg-surface-secondary hover:text-danger">Remove</button>}
        </div>
      </div>
      <select className={`${input} !py-[6px]`} aria-label="Use a template illustration" value={artName} onChange={(e) => e.target.value && onChange(`asset:art?name=${e.target.value}&c1=@primary&c2=@secondary&c3=@accent`)}>
        <option value="">Template illustration…</option>
        {ART_NAMES.map((n) => (<option key={n} value={n}>{n}</option>))}
      </select>
      <input id={id} className={input} value={url} placeholder="…or paste an image address (https://)" onChange={(e) => setUrl(e.target.value)} />
      {error && <p role="alert" className="text-[11.5px] text-danger">{error}</p>}
    </div>
  );
}

export type Dispatchers = {
  setField: (path: string, value: string) => void;
  itemOp: (listKey: string, op: ItemOp, index: number) => void;
};

function Control({ def, path, block, theme, scope, set }: { def: FieldDef; path: string; block: EmailBlock; theme: EmailTheme; scope: UploadScope; set: (path: string, v: string) => void }) {
  const raw = getPath(block, path);
  const value = raw === undefined || raw === null ? "" : String(raw);
  const id = `${block.id}-${path}`;
  const onChange = (v: string) => set(path, v);
  switch (def.kind) {
    case "text":
    case "url":
      return <TextField id={id} def={def} value={value} onChange={onChange} />;
    case "textarea":
      return <TextArea id={id} def={def} value={value} onChange={onChange} rich={block.type === "text" && def.key === "html"} />;
    case "number":
      return <input id={id} type="number" min={def.min} max={def.max} className={`${input} w-28`} value={value} onChange={(e) => e.target.value !== "" && onChange(e.target.value)} />;
    case "toggle":
      return (
        <button id={id} type="button" role="switch" aria-checked={raw === true} onClick={() => onChange(String(raw !== true))} className={`relative h-5 w-9 rounded-full transition-colors ${raw === true ? "bg-primary" : "bg-border-strong"}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] ${raw === true ? "left-[18px]" : "left-0.5"}`} />
        </button>
      );
    case "select":
      return (
        <div className="flex flex-wrap gap-1" role="group" aria-label={def.label}>
          {def.options.length <= 4 ? def.options.map((o) => (
            <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)} className={`h-8 rounded-[8px] border px-3 text-[12.5px] font-medium transition-colors ${value === o.value ? "border-primary bg-primary-surface text-primary" : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary"}`}>{o.label}</button>
          )) : (
            <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={input}>{def.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select>
          )}
        </div>
      );
    case "color":
      return <ColorField id={id} value={value} theme={theme} onChange={onChange} />;
    case "image":
      return <ImageField id={id} value={value} theme={theme} scope={scope} onChange={onChange} />;
    case "items":
      return null;
  }
}

export function FieldList({ fields, block, theme, scope, d, basePath = "" }: { fields: FieldDef[]; block: EmailBlock; theme: EmailTheme; scope: UploadScope; d: Dispatchers; basePath?: string }) {
  return (
    <div className="space-y-4">
      {fields.map((def) => {
        const path = basePath ? `${basePath}.${def.key}` : def.key;
        if (def.kind === "items") return <ItemsField key={path} def={def} block={block} theme={theme} scope={scope} d={d} />;
        return (
          <FieldRow key={path} label={def.label} htmlFor={`${block.id}-${path}`} help={"help" in def ? def.help : undefined}>
            <Control def={def} path={path} block={block} theme={theme} scope={scope} set={d.setField} />
          </FieldRow>
        );
      })}
    </div>
  );
}

function ItemsField({ def, block, theme, scope, d }: { def: Extract<FieldDef, { kind: "items" }>; block: EmailBlock; theme: EmailTheme; scope: UploadScope; d: Dispatchers }) {
  const items = (getPath(block, def.key) as Record<string, unknown>[] | undefined) ?? [];
  const [open, setOpen] = React.useState<number | null>(items.length === 1 ? 0 : null);
  const titleOf = (item: Record<string, unknown>, i: number) => String(item.title ?? item.label ?? item.name ?? item.quote ?? item.network ?? `${def.itemLabel} ${i + 1}`).slice(0, 40) || `${def.itemLabel} ${i + 1}`;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] font-medium text-text-secondary">{def.label}</span>
        <span className="text-[11px] text-text-tertiary">{items.length}/{def.max}</span>
      </div>
      <ul className="overflow-hidden rounded-[10px] border border-border bg-surface">
        {items.map((item, i) => (
          <li key={i} className="border-b border-border last:border-b-0">
            <div className="flex items-center gap-1 px-2.5 py-1.5">
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="min-w-0 flex-1 truncate text-left text-[12.5px] font-medium text-text-primary">{titleOf(item, i)}</button>
              <IconBtn label="Move up" disabled={i === 0} onClick={() => d.itemOp(def.key, "up", i)}><ArrowUp size={13} /></IconBtn>
              <IconBtn label="Move down" disabled={i === items.length - 1} onClick={() => d.itemOp(def.key, "down", i)}><ArrowDown size={13} /></IconBtn>
              <IconBtn label="Remove" danger disabled={items.length <= def.min} onClick={() => { d.itemOp(def.key, "remove", i); setOpen(null); }}><Trash2 size={13} /></IconBtn>
            </div>
            {open === i && (
              <div className="border-t border-border bg-surface-secondary/60 p-3">
                <FieldList fields={def.fields} block={block} theme={theme} scope={scope} d={d} basePath={`${def.key}.${i}`} />
              </div>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="px-3 py-2.5 text-[12.5px] text-text-tertiary">No {def.itemLabel.toLowerCase()}s yet.</li>}
      </ul>
      <button type="button" disabled={items.length >= def.max} onClick={() => { d.itemOp(def.key, "add", 0); setOpen(items.length); }} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-dashed border-border-strong px-3 text-[12.5px] font-medium text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50">
        <Plus size={13} /> Add {def.itemLabel.toLowerCase()}
      </button>
    </div>
  );
}

export function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`grid h-7 w-7 shrink-0 place-items-center rounded-[6px] text-text-tertiary transition-colors disabled:pointer-events-none disabled:opacity-30 ${danger ? "hover:bg-danger-surface hover:text-danger" : "hover:bg-surface-secondary hover:text-text-primary"}`}>{children}</button>
  );
}
