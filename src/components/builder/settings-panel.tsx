"use client";

import { Copy, MousePointerClick, Trash2 } from "lucide-react";
import type { EmailBlock, EmailTheme } from "@/db/schema";
import { fieldsFor, labelFor } from "@/lib/email-builder/catalog";
import { BLOCK_ICONS } from "./block-icons";
import { FieldList, IconBtn, type Dispatchers, type UploadScope } from "./fields";

export function SettingsPanel({ block, theme, scope, d, onDuplicate, onRemove }: {
  block: EmailBlock | null; theme: EmailTheme; scope: UploadScope; d: Dispatchers; onDuplicate: () => void; onRemove: () => void;
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
  const fields = fieldsFor(block.type);
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
        {fields.length === 0 ? <p className="text-[12.5px] text-text-tertiary">This section has no settings.</p> : <FieldList key={block.id} fields={fields} block={block} theme={theme} scope={scope} d={d} />}
      </div>
    </div>
  );
}
