"use client";

import { Copy, MousePointerClick, Shapes, Trash2 } from "lucide-react";
import type { EmailBlock, EmailTheme } from "@/db/schema";
import { fieldsFor, labelFor } from "@/lib/email-builder/catalog";
import { BLOCK_ICONS } from "./block-icons";
import { FieldList, IconBtn, type Dispatchers, type UploadScope } from "./fields";

export function SettingsPanel({ block, theme, scope, d, onDuplicate, onRemove, onOpenDesigner }: {
  block: EmailBlock | null; theme: EmailTheme; scope: UploadScope; d: Dispatchers; onDuplicate: () => void; onRemove: () => void; onOpenDesigner: () => void;
}) {
  if (!block) {
    return (
      <div className="grid h-full place-items-center px-8 text-center">
        <div>
          <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-surface-secondary text-text-tertiary"><MousePointerClick size={18} /></span>
          <p className="text-[13px] font-medium text-text-primary">Nothing selected</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-tertiary">Click a section in the preview or in the list to edit its content and style.</p>
        </div>
      </div>
    );
  }
  const Icon = BLOCK_ICONS[block.type];
  // The designer owns the elements and the email picture of a Free layout, so they are not listed as form fields.
  const fields = fieldsFor(block.type).filter((f) => !(block.type === "canvas" && (f.key === "items" || f.key === "rendered")));
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-primary-surface text-primary"><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-text-primary">{labelFor(block.type)}</p>
          <p className="text-[11.5px] text-text-tertiary">Section settings</p>
        </div>
        <IconBtn label="Duplicate section" onClick={onDuplicate}><Copy size={14} /></IconBtn>
        <IconBtn label="Delete section" danger onClick={onRemove}><Trash2 size={14} /></IconBtn>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {block.type !== "spacer" && block.type !== "divider" && block.type !== "wave" && (
          <button type="button" onClick={onOpenDesigner} className="mb-4 flex w-full items-center gap-3 rounded-[12px] border border-primary/30 bg-primary-surface p-3 text-left transition-colors hover:border-primary">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary text-white"><Shapes size={17} /></span>
            <span><span className="block text-[13px] font-semibold text-text-primary">{block.type === "canvas" ? "Open the designer" : "Edit freely"} <span className="font-normal text-text-tertiary">(Enter)</span></span><span className="block text-[12px] text-text-secondary">{block.type === "canvas" ? `Place text, images, buttons and shapes anywhere. ${block.items.length} elements.` : "Move and resize every element anywhere, Canva-style. In emails this section is sent as a picture."}</span></span>
          </button>
        )}
        {fields.length === 0 ? <p className="text-[12.5px] text-text-tertiary">This section has no settings.</p> : <FieldList key={block.id} fields={fields} block={block} theme={theme} scope={scope} d={d} />}
      </div>
    </div>
  );
}
