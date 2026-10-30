"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

/** Read-only text with a copy button (public link, embed code). */
export function CopyField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the text is selectable, the person can copy by hand */
    }
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-text-primary">{label}</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12.5px] font-semibold text-primary hover:bg-primary-surface">
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {multiline ? (
        <textarea readOnly value={value} rows={4} onFocus={(e) => e.currentTarget.select()} className="w-full resize-none rounded-[10px] border border-border bg-surface-secondary px-3 py-2.5 font-mono text-[12px] leading-relaxed text-text-primary outline-none" />
      ) : (
        <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="h-10 w-full rounded-[10px] border border-border bg-surface-secondary px-3 font-mono text-[12.5px] text-text-primary outline-none" />
      )}
    </div>
  );
}
