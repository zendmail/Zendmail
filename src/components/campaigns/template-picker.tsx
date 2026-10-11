import Link from "next/link";
import { Crown, Lock } from "lucide-react";
import { applyTemplateAction } from "@/lib/actions/campaign-actions";
import { TemplateThumb } from "@/components/templates/template-frame";
import { categoryLabels } from "@/components/templates/template-catalog";
import { canUseTemplate } from "@/lib/template-access";
import type { TemplateListItem } from "@/components/templates/template-types";

/** A scrolling strip of live template thumbnails. Pro templates are previewable but locked on the Free plan. */
export function TemplatePicker({ campaignId, templates, planName }: { campaignId: string; templates: TemplateListItem[]; planName: string }) {
  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
      {templates.map((t) => {
        const locked = !canUseTemplate(planName, t.tier);
        return (
          <div key={t.id} className="w-[172px] shrink-0 snap-start overflow-hidden rounded-[14px] border border-border bg-surface">
            <div className="relative">
              <TemplateThumb id={t.id} name={t.name} height={210} />
              {t.tier === "PRO" && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-bold text-primary shadow-[var(--shadow-xs)]"><Crown size={10} /> Pro</span>
              )}
            </div>
            <div className="space-y-2 p-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-bold text-text-primary" title={t.name}>{t.name}</p>
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">{categoryLabels[t.category] ?? "Custom"}</p>
              </div>
              {locked ? (
                <Link href="/workspace/billing?upgrade=templates" className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-[#0B1A3D] text-[12px] font-semibold text-white hover:bg-[#13285A]"><Lock size={12} /> Upgrade</Link>
              ) : (
                <form action={applyTemplateAction}>
                  <input type="hidden" name="campaignId" value={campaignId} />
                  <input type="hidden" name="templateId" value={t.id} />
                  <button type="submit" aria-label={`Use ${t.name} template`} className="flex h-8 w-full items-center justify-center rounded-[8px] bg-primary text-[12px] font-semibold text-white hover:bg-primary-hover">Use template</button>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
