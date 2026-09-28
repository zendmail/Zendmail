import { ArrowUpRight, LayoutTemplate } from "lucide-react";
import { categoryLabels, type Template } from "@/components/templates/template-catalog";
import { TemplatePreview } from "@/components/templates/template-preview";

export function TemplateCard({
  template,
  selected,
  onOpen,
}: {
  template: Template;
  selected: boolean;
  onOpen: (template: Template) => void;
}) {
  const blockCount = Array.isArray(template.blocks) ? template.blocks.length : 0;
  const description = template.subject || template.previewText || "A ready-to-customize email design.";

  return (
    <button
      type="button"
      aria-label={`Open template ${template.name}`}
      aria-pressed={selected}
      onClick={() => onOpen(template)}
      className={`group w-full overflow-hidden rounded-[10px] border bg-surface text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selected ? "border-primary/60 ring-2 ring-primary/10 shadow-[var(--shadow-xs)]" : "border-border hover:border-border-strong"}`}
    >
      <TemplatePreview template={template} />
      <div className="p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded-[4px] border border-border bg-surface-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary">
            {categoryLabels[template.category] ?? "Custom"}
          </span>
          {selected && <span className="text-[11px] font-semibold text-primary">Selected</span>}
        </div>
        <h2 className="truncate text-[16px] font-semibold leading-[1.35] text-text-primary">{template.name}</h2>
        <p className="mt-1 truncate text-[13px] font-normal leading-[1.45] text-text-secondary">{description}</p>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[12px] font-medium text-text-tertiary">
          <span className="flex items-center gap-1.5"><LayoutTemplate size={13} /> {blockCount} content blocks</span>
          <span className="inline-flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Open template <ArrowUpRight size={13} />
          </span>
        </div>
      </div>
    </button>
  );
}