"use client";

import * as React from "react";
import { useTransition } from "react";
import { ArrowDown, ArrowUp, ImageUp, LoaderCircle, Plus, Trash2 } from "lucide-react";
import type { EmailBlock, EmailTheme } from "@/db/schema";
import { sectionItemAction, updateSectionFieldAction } from "@/lib/actions/campaign-actions";
import { SECTION_DEFS, isSectionType, type FieldDef } from "@/lib/email-builder/schema";
import { ART_NAMES } from "@/lib/email-builder/assets";
import { COLOR_TOKENS, TOKEN_LABELS, isToken, normalizeHex, resolveColor } from "@/lib/email-builder/theme";
import { uploadCampaignImage } from "@/components/campaigns/upload-image";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1.5 text-[13px] text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

type Save = (path: string, value: string) => void;

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined), source);
}

function Label({ children, htmlFor, help }: { children: React.ReactNode; htmlFor?: string; help?: string }) {
  return (
    <div className="mb-1">
      <label htmlFor={htmlFor} className="text-[11.5px] font-semibold text-text-secondary">{children}</label>
      {help && <p className="text-[11px] leading-snug text-text-tertiary">{help}</p>}
    </div>
  );
}

function ColorControl({ id, value, theme, onSave }: { id: string; value: string; theme: EmailTheme; onSave: (v: string) => void }) {
  const mode = value === "" ? "" : isToken(value) ? value : "custom";
  const swatch = resolveColor(value || undefined, theme, "transparent");
  const [custom, setCustom] = React.useState(normalizeHex(value) ?? "#0B5FFF");
  const [customOpen, setCustomOpen] = React.useState(mode === "custom");
  return (
    <div className="flex items-center gap-2">
      <span className="h-7 w-7 shrink-0 rounded-md border border-border" style={{ background: value ? swatch : "repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 10px 10px" }} aria-hidden="true" />
      <select
        id={id}
        className={inputClass}
        value={customOpen ? "custom" : mode}
        onChange={(e) => {
          if (e.target.value === "custom") { setCustomOpen(true); onSave(custom); return; }
          setCustomOpen(false);
          onSave(e.target.value);
        }}
      >
        <option value="">Template default</option>
        {COLOR_TOKENS.map((t) => (<option key={t} value={`@${t}`}>{TOKEN_LABELS[t]}</option>))}
        <option value="custom">Custom colour…</option>
      </select>
      {customOpen && (
        <input
          type="color"
          value={custom}
          aria-label="Custom colour"
          onChange={(e) => setCustom(e.target.value.toUpperCase())}
          onBlur={() => onSave(custom)}
          className="h-8 w-9 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
      )}
    </div>
  );
}

function ImageControl({ id, campaignId, value, onSave }: { id: string; campaignId: string; value: string; onSave: (v: string) => void }) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [text, setText] = React.useState(value);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const isArt = value.startsWith("asset:art");
  const artName = isArt ? new URLSearchParams(value.split("?")[1]).get("name") ?? "" : "";

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <input id={id} className={inputClass} value={isArt ? "" : text} placeholder={isArt ? "Using template illustration" : "https://… image address"} onChange={(e) => setText(e.target.value)} onBlur={() => !isArt && text !== value && onSave(text)} />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" aria-label="Upload an image" onChange={async (e) => {
          const file = e.currentTarget.files?.[0]; e.currentTarget.value = "";
          if (!file) return;
          setBusy(true); setError("");
          try { onSave(await uploadCampaignImage(campaignId, file)); } catch (err) { setError(err instanceof Error ? err.message : "Upload failed."); } finally { setBusy(false); }
        }} />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-[12px] font-semibold text-text-primary hover:bg-surface-secondary disabled:opacity-60">
          {busy ? <LoaderCircle size={13} className="animate-spin" /> : <ImageUp size={13} />} Upload
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <select className={`${inputClass} !py-1`} aria-label="Use a template illustration" value={artName} onChange={(e) => e.target.value && onSave(`asset:art?name=${e.target.value}&c1=@primary&c2=@secondary&c3=@accent`)}>
          <option value="">Template illustration…</option>
          {ART_NAMES.map((n) => (<option key={n} value={n}>{n}</option>))}
        </select>
        {value && <button type="button" onClick={() => onSave("")} className="shrink-0 text-[12px] font-semibold text-text-secondary underline hover:text-danger">Remove</button>}
      </div>
      {error && <p role="alert" className="text-[11.5px] text-danger">{error}</p>}
    </div>
  );
}

function FieldControl({ def, path, block, campaignId, theme, save }: { def: FieldDef; path: string; block: EmailBlock; campaignId: string; theme: EmailTheme; save: Save }) {
  const raw = getPath(block, path);
  const id = `${block.id}-${path}`;
  const value = raw === undefined || raw === null ? "" : String(raw);
  // Re-key on the saved value so inputs pick up changes that come back from the server.
  const key = `${path}:${value}`;

  switch (def.kind) {
    case "text":
    case "url":
      return <input key={key} id={id} defaultValue={value} maxLength={def.kind === "text" ? def.max : 1000} placeholder={def.kind === "url" ? "https://…" : undefined} onBlur={(e) => e.target.value !== value && save(path, e.target.value)} className={inputClass} />;
    case "textarea":
      return <textarea key={key} id={id} defaultValue={value} rows={3} maxLength={def.max} onBlur={(e) => e.target.value !== value && save(path, e.target.value)} className={`${inputClass} h-auto resize-y`} />;
    case "number":
      return <input key={key} id={id} type="number" min={def.min} max={def.max} defaultValue={value} onBlur={(e) => e.target.value !== value && save(path, e.target.value)} className={`${inputClass} w-28`} />;
    case "toggle":
      return (
        <label className="flex items-center gap-2 text-[12.5px] text-text-primary">
          <input key={key} id={id} type="checkbox" defaultChecked={raw === true} onChange={(e) => save(path, String(e.target.checked))} className="h-4 w-4 accent-[var(--color-primary)]" />
          Yes
        </label>
      );
    case "select":
      return (
        <select key={key} id={id} defaultValue={value} onChange={(e) => save(path, e.target.value)} className={inputClass}>
          {def.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      );
    case "color":
      return <ColorControl key={key} id={id} value={value} theme={theme} onSave={(v) => save(path, v)} />;
    case "image":
      return <ImageControl key={key} id={id} campaignId={campaignId} value={value} onSave={(v) => save(path, v)} />;
    case "items":
      return null;
  }
}

export function SectionFields({ campaignId, block, theme }: { campaignId: string; block: EmailBlock; theme: EmailTheme }) {
  const [pending, startTransition] = useTransition();
  if (!isSectionType(block.type)) return null;
  const def = SECTION_DEFS[block.type];

  const save: Save = (path, value) => {
    const fd = new FormData();
    fd.set("campaignId", campaignId); fd.set("blockId", block.id); fd.set("path", path); fd.set("value", value);
    startTransition(() => { updateSectionFieldAction(fd); });
  };
  const itemOp = (listKey: string, op: string, index = -1) => {
    const fd = new FormData();
    fd.set("campaignId", campaignId); fd.set("blockId", block.id); fd.set("listKey", listKey); fd.set("op", op); fd.set("index", String(index));
    startTransition(() => { sectionItemAction(fd); });
  };

  const plain = def.fields.filter((f) => f.kind !== "color" && f.kind !== "items");
  const lists = def.fields.filter((f): f is Extract<FieldDef, { kind: "items" }> => f.kind === "items");
  const colors = def.fields.filter((f) => f.kind === "color");

  return (
    <div className={`space-y-3 ${pending ? "opacity-80" : ""}`} aria-busy={pending}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {plain.map((f) => (
          <div key={f.key} className={f.kind === "textarea" || f.kind === "image" ? "sm:col-span-2" : ""}>
            <Label htmlFor={`${block.id}-${f.key}`} help={"help" in f ? f.help : undefined}>{f.label}</Label>
            <FieldControl def={f} path={f.key} block={block} campaignId={campaignId} theme={theme} save={save} />
          </div>
        ))}
      </div>

      {lists.map((list) => {
        const items = (getPath(block, list.key) as unknown[] | undefined) ?? [];
        return (
          <div key={list.key} className="space-y-2">
            <p className="text-[11.5px] font-semibold text-text-secondary">{list.label}</p>
            {items.map((item, i) => {
              const title = String((item as Record<string, unknown>).title ?? (item as Record<string, unknown>).label ?? (item as Record<string, unknown>).name ?? (item as Record<string, unknown>).network ?? `${list.itemLabel} ${i + 1}`);
              return (
                <details key={i} className="rounded-[var(--radius-sm)] border border-border bg-surface-secondary/50" open={items.length <= 2}>
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-2.5 py-1.5 text-[12.5px] font-semibold text-text-primary">
                    <span className="truncate">{i + 1}. {title.slice(0, 40)}</span>
                    <span className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.preventDefault()}>
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => itemOp(list.key, "up", i)} className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface disabled:opacity-30"><ArrowUp size={12} /></button>
                      <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => itemOp(list.key, "down", i)} className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface disabled:opacity-30"><ArrowDown size={12} /></button>
                      <button type="button" aria-label={`Remove ${list.itemLabel.toLowerCase()}`} disabled={items.length <= list.min} onClick={() => itemOp(list.key, "remove", i)} className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-danger-surface hover:text-danger disabled:opacity-30"><Trash2 size={12} /></button>
                    </span>
                  </summary>
                  <div className="grid gap-2.5 border-t border-border p-2.5 sm:grid-cols-2">
                    {list.fields.map((f) => (
                      <div key={f.key} className={f.kind === "textarea" || f.kind === "image" ? "sm:col-span-2" : ""}>
                        <Label htmlFor={`${block.id}-${list.key}.${i}.${f.key}`}>{f.label}</Label>
                        <FieldControl def={f} path={`${list.key}.${i}.${f.key}`} block={block} campaignId={campaignId} theme={theme} save={save} />
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
            <button type="button" disabled={items.length >= list.max} onClick={() => itemOp(list.key, "add")} className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed border-border-strong px-3 text-[12px] font-semibold text-primary hover:bg-primary-surface disabled:opacity-40">
              <Plus size={13} /> Add {list.itemLabel.toLowerCase()}
            </button>
          </div>
        );
      })}

      {colors.length > 0 && (
        <div className="space-y-2 border-t border-border pt-2.5">
          <p className="text-[11.5px] font-semibold text-text-secondary">Colours</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {colors.map((f) => (
              <div key={f.key}>
                <Label htmlFor={`${block.id}-${f.key}`}>{f.label}</Label>
                <FieldControl def={f} path={f.key} block={block} campaignId={campaignId} theme={theme} save={save} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
