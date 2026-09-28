import { ArrowUpRight } from "lucide-react";
import { categoryImages, categoryLabels, getTemplatePreviewContent, type Template } from "@/components/templates/template-catalog";

export function TemplatePreview({ template, size = "compact" }: { template: Template; size?: "compact" | "large" }) {
  const image = categoryImages[template.category] ?? categoryImages.CUSTOM;
  const compact = size === "compact";
  const { headline, supportingText, buttonLabel } = getTemplatePreviewContent(template);

  return (
    <div
      role="img"
      aria-label={`${template.name} email design preview`}
      className={`relative isolate aspect-video overflow-hidden bg-slate-900 text-white ${compact ? "rounded-t-[10px]" : "rounded-lg border border-border"}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-cover bg-center transition-transform duration-200 group-hover:scale-[1.01]"
        style={{
          backgroundImage: `linear-gradient(90deg, rgb(5 18 38 / 0.84) 0%, rgb(5 18 38 / 0.62) 44%, rgb(5 18 38 / 0.12) 100%), url("${image}")`,
        }}
      />
      <div className={`flex h-full flex-col justify-between ${compact ? "p-3.5" : "p-5 sm:p-7"}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`flex items-center gap-1.5 font-bold text-white drop-shadow ${compact ? "text-[11px]" : "text-[13px]"}`}>
            <span className={`flex items-center justify-center rounded-[4px] bg-white font-extrabold text-primary ${compact ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-[13px]"}`}>Z</span>
            Zendmail
          </span>
          <span className={`rounded-[4px] bg-white/15 font-semibold text-white backdrop-blur-[2px] ${compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-[11px]"}`}>
            {categoryLabels[template.category] ?? "Custom"}
          </span>
        </div>

        <div className="max-w-[84%] pb-0.5">
          <h2 className={`line-clamp-2 font-bold leading-[1.08] text-white drop-shadow-sm ${compact ? "text-[20px]" : "text-[26px]"}`}>
            {headline}
          </h2>
          <p className={`mt-1.5 line-clamp-2 leading-[1.35] text-white/90 drop-shadow ${compact ? "text-[12px]" : "text-[14px]"}`}>
            {supportingText}
          </p>
          <span className={`mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-[5px] bg-white font-semibold text-slate-900 shadow-sm ${compact ? "px-2.5 py-1.5 text-[12px]" : "px-3.5 py-2 text-[12px]"}`}>
            <span className="truncate">{buttonLabel}</span>
            <ArrowUpRight size={compact ? 12 : 14} />
          </span>
        </div>
      </div>
    </div>
  );
}