"use client";

import * as React from "react";
import { Monitor, Smartphone } from "lucide-react";

/** Live preview with a Desktop / Mobile switch. The HTML is rendered on the server; this only frames it. */
export function EmailPreviewFrame({ html }: { html: string }) {
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-[10px] border border-border bg-surface p-0.5" role="group" aria-label="Preview device">
        {([["desktop", Monitor, "Desktop"], ["mobile", Smartphone, "Mobile"]] as const).map(([value, Icon, label]) => (
          <button key={value} type="button" aria-pressed={device === value} onClick={() => setDevice(value)} className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[12.5px] font-semibold ${device === value ? "bg-primary text-white" : "text-text-secondary hover:bg-surface-secondary"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
      <div className="rounded-[var(--radius-md)] border border-border bg-[#E7ECF4] p-2">
        <iframe title="Email preview" srcDoc={html} sandbox="" className="mx-auto block h-[640px] rounded-[10px] border-0 bg-white transition-[width] duration-200" style={{ width: device === "desktop" ? "100%" : 390, maxWidth: "100%" }} />
      </div>
    </div>
  );
}
