import { applyTemplateAction } from "@/lib/actions/campaign-actions";
import { categoryImages, categoryLabels, type Template } from "@/components/templates/template-catalog";

export async function TemplatePicker({
  campaignId,
  templates,
}: {
  campaignId: string;
  templates: Template[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {templates.map((t) => (
        <form key={t.id} action={applyTemplateAction} className="min-w-0">
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="templateId" value={t.id} />
          <button
            type="submit"
            aria-label={`Use ${t.name} template`}
            className="flex w-full min-w-0 items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-2 text-left transition-[border-color,background-color] duration-150 hover:border-primary/60 hover:bg-surface-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <span
              role="img"
              aria-label={`${categoryLabels[t.category] || "Custom"} template image`}
              className="aspect-video w-[76px] shrink-0 rounded-[4px] border border-border bg-cover bg-center"
              style={{ backgroundImage: `url("${categoryImages[t.category] ?? categoryImages.CUSTOM}")` }}
            />
            <span className="min-w-0 flex-1 py-0.5">
              <span className="mb-1 block truncate text-[13px] font-semibold leading-4 text-text-primary">{t.name}</span>
              <span className="block truncate text-[12px] leading-4 text-text-secondary">
                {t.subject || t.previewText || "Email template"}
              </span>
              <span className="mt-1 block truncate text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                {categoryLabels[t.category] || "Custom"}
              </span>
            </span>
          </button>
        </form>
      ))}
    </div>
  );
}
