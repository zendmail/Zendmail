"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CircleAlert, Layers, LoaderCircle, Monitor, PanelsTopLeft, Palette, Plus, Redo2, Smartphone, Undo2 } from "lucide-react";
import type { EmailBlockType, EmailTheme } from "@/db/schema";
import { MAX_BLOCKS, type EmailDocument } from "@/lib/email-builder/document";
import { editorReducer, initEditorState } from "@/lib/email-builder/editor-state";
import { createSaveQueue, type SaveStatus } from "@/lib/email-builder/save-queue";
import type { ItemOp } from "@/lib/email-builder/schema";
import { saveCampaignDocument, saveTemplateDocument, saveCampaignAsTemplateAction, renameTemplateAction } from "@/lib/actions/builder-actions";
import { AddPanel } from "./add-panel";
import { Canvas, type CanvasMessage } from "./canvas";
import { Outline } from "./outline";
import { SettingsPanel } from "./settings-panel";
import { ThemeTab } from "./theme-tab";

type Props = {
  kind: "campaign" | "template";
  id: string;
  name: string;
  initialDoc: EmailDocument;
  initialRevision: number;
  backHref: string;
  doneHref: string;
  doneLabel: string;
};

type LeftTab = "sections" | "add" | "theme";
type MobilePane = "preview" | "sections" | "settings";

const STATUS_TEXT: Record<SaveStatus, string> = { saved: "All changes saved", dirty: "Unsaved changes", saving: "Saving…", retrying: "Connection problem — retrying", blocked: "Not saved" };

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

export function Builder({ kind, id, name, initialDoc, initialRevision, backHref, doneHref, doneLabel }: Props) {
  const router = useRouter();
  const [state, dispatch] = React.useReducer(editorReducer, initialDoc, initEditorState);
  const [tab, setTab] = React.useState<LeftTab>("sections");
  const [mobile, setMobile] = React.useState<MobilePane>("preview");
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [scrollTarget, setScrollTarget] = React.useState<{ id: string; n: number } | null>(null);
  const [status, setStatus] = React.useState<{ s: SaveStatus; message?: string }>({ s: "saved" });
  const [title, setTitle] = React.useState(name);
  const [leaving, setLeaving] = React.useState(false);

  const stateRef = React.useRef(state);
  React.useEffect(() => { stateRef.current = state; });
  const queue = React.useRef<ReturnType<typeof createSaveQueue> | null>(null);

  React.useEffect(() => {
    const save = kind === "campaign" ? saveCampaignDocument : saveTemplateDocument;
    const q = createSaveQueue({
      initialRevision,
      snapshot: () => ({ version: stateRef.current.version, document: stateRef.current.doc }),
      save: async ({ expectedRevision, document }) => save({ id, expectedRevision, document }),
      onStatus: (s, info) => setStatus({ s, message: info.message }),
    });
    queue.current = q;
    return () => q.dispose();
  }, [kind, id, initialRevision]);

  React.useEffect(() => {
    queue.current?.notify();
  }, [state.version]);

  // Warn before closing with unsaved work, and push pending changes out when the tab is hidden.
  React.useEffect(() => {
    const before = (e: BeforeUnloadEvent) => { if (queue.current?.isDirty()) { e.preventDefault(); e.returnValue = ""; } };
    const hidden = () => { if (document.visibilityState === "hidden") void queue.current?.flush(); };
    window.addEventListener("beforeunload", before);
    document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("beforeunload", before); document.removeEventListener("visibilitychange", hidden); };
  }, []);

  const { doc, selectedId } = state;
  const selected = doc.blocks.find((b) => b.id === selectedId) ?? null;
  const atLimit = doc.blocks.length >= MAX_BLOCKS;

  const reveal = React.useCallback((blockId: string) => setScrollTarget((t) => ({ id: blockId, n: (t?.n ?? 0) + 1 })), []);
  const select = React.useCallback((blockId: string | null) => { dispatch({ type: "SELECT", id: blockId }); }, []);
  const selectFromList = React.useCallback((blockId: string) => { dispatch({ type: "SELECT", id: blockId }); reveal(blockId); setMobile("settings"); }, [reveal]);
  const move = React.useCallback((blockId: string, delta: number) => {
    const s = stateRef.current;
    const i = s.doc.blocks.findIndex((b) => b.id === blockId);
    if (i >= 0) dispatch({ type: "MOVE", id: blockId, toIndex: i + delta });
  }, []);

  const addBlock = (type: EmailBlockType) => {
    const s = stateRef.current;
    const at = s.selectedId ? s.doc.blocks.findIndex((b) => b.id === s.selectedId) + 1 : s.doc.blocks.length;
    dispatch({ type: "ADD", blockType: type, index: at });
    setTab("sections");
    setMobile("settings");
  };
  // After an ADD the reducer selects the new block; scroll the canvas to it.
  const lastSelected = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (selectedId && selectedId !== lastSelected.current && state.coalesceKey === null && stateRef.current.past.length > 0) {
      const prev = stateRef.current.past[stateRef.current.past.length - 1];
      if (!prev.blocks.some((b) => b.id === selectedId)) reveal(selectedId);
    }
    lastSelected.current = selectedId;
  }, [selectedId, state.coalesceKey, reveal]);

  const onCanvas = React.useCallback((m: CanvasMessage) => {
    if (m.zm === "select") { select(m.id); if (m.id) setMobile("settings"); }
    else if (m.zm === "history") dispatch({ type: m.dir === "undo" ? "UNDO" : "REDO" });
    else if (m.zm === "action" && m.id) {
      if (m.action === "up") move(m.id, -1);
      else if (m.action === "down") move(m.id, 1);
      else if (m.action === "duplicate") dispatch({ type: "DUPLICATE", id: m.id });
      else dispatch({ type: "REMOVE", id: m.id });
    }
  }, [move, select]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const typing = isTyping(e.target);
      const sel = stateRef.current.selectedId;
      if (mod && !typing && (e.key === "z" || e.key === "Z")) { e.preventDefault(); dispatch({ type: e.shiftKey ? "REDO" : "UNDO" }); }
      else if (mod && !typing && (e.key === "y" || e.key === "Y")) { e.preventDefault(); dispatch({ type: "REDO" }); }
      else if (!typing && sel && mod && (e.key === "d" || e.key === "D")) { e.preventDefault(); dispatch({ type: "DUPLICATE", id: sel }); }
      else if (!typing && sel && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); dispatch({ type: "REMOVE", id: sel }); }
      else if (!typing && sel && e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); move(sel, e.key === "ArrowUp" ? -1 : 1); }
      else if (e.key === "Escape" && !typing) dispatch({ type: "SELECT", id: null });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const dispatchers = React.useMemo(() => ({
    setField: (path: string, value: string) => { const sel = stateRef.current.selectedId; if (sel) dispatch({ type: "FIELD", id: sel, path, value }); },
    itemOp: (listKey: string, op: ItemOp, index: number) => { const sel = stateRef.current.selectedId; if (sel) dispatch({ type: "ITEM_OP", id: sel, listKey, op, index }); },
  }), []);

  async function finish() {
    setLeaving(true);
    const ok = await queue.current?.flush();
    if (ok) router.push(doneHref);
    else setLeaving(false);
  }

  const blocked = status.s === "blocked";
  const scope = { kind, id } as const;

  return (
    <div className="flex h-dvh flex-col bg-background text-text-primary">
      {/* Top bar */}
      <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <button type="button" onClick={async () => { await queue.current?.flush(); router.push(backHref); }} aria-label="Back" className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary hover:bg-surface-secondary hover:text-text-primary"><ArrowLeft size={16} /></button>
        <div className="min-w-0 flex-1 sm:flex-none sm:basis-[260px]">
          {kind === "template" ? (
            <input aria-label="Template name" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} onBlur={() => { if (title.trim().length >= 2 && title.trim() !== name) void renameTemplateAction(id, title); else setTitle(name); }} className="w-full truncate rounded-[6px] border border-transparent bg-transparent px-1.5 py-1 text-[14px] font-semibold outline-none hover:border-border focus:border-primary" />
          ) : (
            <p className="truncate px-1.5 text-[14px] font-semibold">{name}</p>
          )}
        </div>
        <div className="mx-auto hidden items-center gap-0.5 rounded-[10px] border border-border bg-surface-secondary/60 p-0.5 md:flex" role="group" aria-label="Preview device">
          {([["desktop", Monitor, "Desktop"], ["mobile", Smartphone, "Mobile"]] as const).map(([v, Icon, label]) => (
            <button key={v} type="button" aria-pressed={device === v} onClick={() => setDevice(v)} className={`inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 text-[12.5px] font-medium transition-colors ${device === v ? "bg-surface text-text-primary shadow-[var(--shadow-xs)]" : "text-text-tertiary hover:text-text-primary"}`}><Icon size={14} /> {label}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button type="button" aria-label="Undo" title="Undo (Ctrl/⌘ Z)" disabled={state.past.length === 0} onClick={() => dispatch({ type: "UNDO" })} className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary hover:bg-surface-secondary disabled:opacity-30"><Undo2 size={16} /></button>
          <button type="button" aria-label="Redo" title="Redo (Ctrl/⌘ Shift Z)" disabled={state.future.length === 0} onClick={() => dispatch({ type: "REDO" })} className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary hover:bg-surface-secondary disabled:opacity-30"><Redo2 size={16} /></button>
        </div>
        <div role="status" aria-live="polite" className={`hidden items-center gap-1.5 px-2 text-[12px] sm:flex ${blocked ? "font-medium text-danger" : "text-text-tertiary"}`}>
          {status.s === "saving" || status.s === "retrying" ? <LoaderCircle size={13} className="animate-spin" /> : blocked ? <CircleAlert size={13} /> : status.s === "saved" ? <Check size={13} className="text-success" /> : <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
          {STATUS_TEXT[status.s]}
        </div>
        {kind === "campaign" && <SaveAsTemplate campaignId={id} defaultName={name} />}
        <button type="button" disabled={leaving || blocked} onClick={finish} className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-primary px-3.5 text-[13px] font-semibold text-primary-text-on shadow-[var(--shadow-xs)] transition-colors hover:bg-primary-hover disabled:opacity-60">
          {leaving && <LoaderCircle size={13} className="animate-spin" />} {doneLabel}
        </button>
      </header>

      {blocked && (
        <div role="alert" className="flex items-center justify-between gap-3 border-b border-danger/20 bg-danger-surface px-4 py-2 text-[13px] text-danger">
          <span>{status.message ?? "Your changes could not be saved."}</span>
          <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-[8px] border border-danger/30 bg-surface px-3 py-1 font-semibold hover:bg-danger-surface">Reload</button>
        </div>
      )}

      {/* Panes */}
      <div className="flex min-h-0 flex-1">
        <aside className={`${mobile === "sections" ? "flex" : "hidden"} w-full shrink-0 flex-col border-r border-border bg-surface lg:flex lg:w-[300px]`}>
          <div className="flex shrink-0 gap-0.5 border-b border-border px-2 pt-2" role="tablist" aria-label="Editor panels">
            {([["sections", Layers, "Sections"], ["add", Plus, "Add"], ["theme", Palette, "Theme"]] as const).map(([v, Icon, label]) => (
              <button key={v} role="tab" aria-selected={tab === v} type="button" onClick={() => setTab(v)} className={`-mb-px inline-flex h-9 flex-1 items-center justify-center gap-1.5 border-b-2 text-[12.5px] font-medium transition-colors ${tab === v ? "border-primary text-primary" : "border-transparent text-text-tertiary hover:text-text-primary"}`}><Icon size={14} /> {label}</button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {tab === "sections" && <Outline blocks={doc.blocks} selectedId={selectedId} onSelect={selectFromList} onMove={(bid, to) => dispatch({ type: "MOVE", id: bid, toIndex: to })} onDuplicate={(bid) => dispatch({ type: "DUPLICATE", id: bid })} onRemove={(bid) => dispatch({ type: "REMOVE", id: bid })} onAdd={() => setTab("add")} />}
            {tab === "add" && <AddPanel onPick={addBlock} disabled={atLimit} />}
            {tab === "theme" && <ThemeTab theme={doc.theme} onChange={(patch: Partial<EmailTheme>) => dispatch({ type: "THEME", theme: patch })} onPreset={(t) => dispatch({ type: "REPLACE_THEME", theme: t })} />}
          </div>
        </aside>

        <main className={`${mobile === "preview" ? "block" : "hidden"} min-w-0 flex-1 bg-[#E9EDF4] dark:bg-[#0E1018] lg:block`} onClick={(e) => { if (e.target === e.currentTarget) select(null); }}>
          <Canvas doc={doc} selectedId={selectedId} scrollTarget={scrollTarget} device={device} onMessage={onCanvas} />
        </main>

        <aside className={`${mobile === "settings" ? "block" : "hidden"} w-full shrink-0 border-l border-border bg-surface lg:block lg:w-[336px]`}>
          <SettingsPanel block={selected} theme={doc.theme} scope={scope} d={dispatchers} onDuplicate={() => selected && dispatch({ type: "DUPLICATE", id: selected.id })} onRemove={() => selected && dispatch({ type: "REMOVE", id: selected.id })} />
        </aside>
      </div>

      {/* Mobile pane switcher */}
      <nav className="grid h-12 shrink-0 grid-cols-3 border-t border-border bg-surface lg:hidden" aria-label="Editor view">
        {([["sections", PanelsTopLeft, "Sections"], ["preview", Monitor, "Preview"], ["settings", Palette, "Settings"]] as const).map(([v, Icon, label]) => (
          <button key={v} type="button" aria-pressed={mobile === v} onClick={() => setMobile(v)} className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${mobile === v ? "text-primary" : "text-text-tertiary"}`}><Icon size={16} />{label}</button>
        ))}
      </nav>
    </div>
  );
}

function SaveAsTemplate({ campaignId, defaultName }: { campaignId: string; defaultName: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(`${defaultName} template`.slice(0, 80));
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  return (
    <div className="relative hidden sm:block">
      <button type="button" onClick={() => { setOpen((o) => !o); setMsg(""); }} aria-expanded={open} className="inline-flex h-8 items-center rounded-[10px] border border-border bg-surface px-3 text-[13px] font-medium text-text-primary hover:bg-surface-secondary">Save as template</button>
      {open && (
        <div className="absolute right-0 top-10 z-30 w-72 rounded-[12px] border border-border bg-surface p-3 shadow-[var(--shadow-lg)]">
          <label htmlFor="tpl-name" className="mb-1.5 block text-[12px] font-medium text-text-secondary">Template name</label>
          <input id="tpl-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="w-full rounded-[8px] border border-border bg-surface px-2.5 py-[7px] text-[13px] outline-none focus:border-primary" />
          {msg && <p role="status" className="mt-2 text-[12px] text-text-secondary">{msg}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-[8px] px-3 text-[12.5px] font-medium text-text-secondary hover:bg-surface-secondary">Close</button>
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); const r = await saveCampaignAsTemplateAction(campaignId, name); setBusy(false); setMsg(r.ok ? "Saved to your templates." : r.message ?? "Could not save."); }} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-primary px-3 text-[12.5px] font-semibold text-primary-text-on disabled:opacity-60">{busy && <LoaderCircle size={12} className="animate-spin" />} Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
