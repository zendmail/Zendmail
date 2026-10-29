"use client";

import type { EmailBlockType } from "@/db/schema";
import { BLOCK_BLURBS, CATALOG, labelFor } from "@/lib/email-builder/catalog";
import { BLOCK_ICONS } from "./block-icons";

export function AddPanel({ onPick, disabled }: { onPick: (type: EmailBlockType) => void; disabled?: boolean }) {
  return (
    <div className="space-y-5">
      {disabled && <p className="rounded-[8px] bg-warning-surface px-3 py-2 text-[12.5px] text-warning">You have reached the limit of 80 sections.</p>}
      {CATALOG.map((group) => (
        <section key={group.title}>
          <h3 className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">{group.title}</h3>
          <div className="grid grid-cols-2 gap-2">
            {group.types.map((type) => {
              const Icon = BLOCK_ICONS[type];
              return (
                <button key={type} type="button" disabled={disabled} onClick={() => onPick(type)} className="group flex flex-col items-start gap-2 rounded-[10px] border border-border bg-surface p-2.5 text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-primary/50 hover:shadow-[var(--shadow-md)] disabled:opacity-50">
                  <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-surface-secondary text-text-secondary transition-colors group-hover:bg-primary-surface group-hover:text-primary"><Icon size={16} /></span>
                  <span>
                    <span className="block text-[12.5px] font-semibold text-text-primary">{labelFor(type)}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-text-tertiary">{BLOCK_BLURBS[type]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
