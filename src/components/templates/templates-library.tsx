"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, LayoutTemplate, Plus, Search, X } from "lucide-react";
import { categoryLabels, replaceBusinessName, templateCategories, type Template } from "@/components/templates/template-catalog";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplatePreview } from "@/components/templates/template-preview";

function TemplatesHeader() {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary-surface text-primary">
          <LayoutTemplate size={20} />
        </span>
        <div>
          <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-text-primary">Email templates</h1>
          <p className="mt-1 text-[14px] leading-[1.5] text-text-secondary">A strong first impression starts with the right design.</p>
        </div>
      </div>
      <Link href="/templates/new" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-primary-text-on shadow-[var(--shadow-xs)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <Plus size={16} /> Create template
      </Link>
    </header>
  );
}

function TemplateFilters({ activeCategory, onChange }: { activeCategory: string; onChange: (category: string) => void }) {
  const filters = [{ value: "ALL", label: "All templates" }, ...templateCategories];
  return (
    <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter templates by category">
      {filters.map(({ value, label }) => {
        const active = activeCategory === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(value)}
            className={`shrink-0 rounded-[6px] border px-3 py-2 text-[13px] transition-colors ${active ? "border-primary bg-primary font-semibold text-white" : "border-border bg-surface font-medium text-text-secondary hover:border-border-strong hover:bg-surface-secondary hover:text-text-primary"}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TemplateSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-10 w-full shrink-0 items-center gap-2 rounded-[8px] border border-border bg-surface px-3 text-text-tertiary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 lg:max-w-[240px]">
      <Search size={16} aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search templates"
        aria-label="Search templates by name, category or description"
        className="min-w-0 flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-placeholder"
      />
    </label>
  );
}

function TemplateInspector({ template }: { template?: Template }) {
  const blockCount = template?.blocks.length ?? 0;
  return (
    <aside className="rounded-[10px] border border-border bg-surface p-4">
      <div className="border-b border-border pb-4">
        <h2 className="text-[16px] font-semibold text-text-primary">Template overview</h2>
        <p className="mt-1.5 text-[13px] leading-[1.5] text-text-secondary">Choose a design, then make it yours in the campaign editor.</p>
      </div>

      {template ? (
        <div className="border-b border-border py-4" aria-live="polite">
          <p className="text-[12px] font-semibold tracking-[0.02em] text-text-tertiary">SELECTED DESIGN</p>
          <h3 className="mt-1.5 text-[16px] font-semibold text-text-primary">{template.name}</h3>
          <p className="mt-1.5 text-[13px] leading-[1.5] text-text-secondary">{replaceBusinessName(template.previewText || template.subject || "Ready to make it your own.")}</p>
          <div className="mt-3 flex items-center gap-2 text-[12px] font-medium text-text-secondary">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-surface text-success"><Check size={13} /></span>
            {blockCount} editable content block{blockCount === 1 ? "" : "s"}
          </div>
        </div>
      ) : (
        <p className="border-b border-border py-4 text-[13px] text-text-secondary">No templates match these filters.</p>
      )}

      <div className="py-4">
        <h3 className="text-[12px] font-semibold tracking-[0.02em] text-text-primary">BUILT FOR BETTER SENDS</h3>
        <ul className="mt-3 space-y-2.5">
          {["Responsive email layouts", "Clear calls to action", "Easy to customize"].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[13px] leading-[1.5] text-text-secondary">
              <Check size={14} className="shrink-0 text-success" /> {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[8px] bg-[#10254A] p-4 text-center text-white">
        <p className="text-[15px] font-semibold">Create. Send. Grow.</p>
        <p className="mt-1 text-[13px] leading-[1.5] text-slate-300">Turn your next idea into a campaign.</p>
        <Link href="/templates/new" className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] bg-white px-3 text-[13px] font-semibold text-[#10254A] transition-colors hover:bg-slate-100">
          <Plus size={14} /> Create template
        </Link>
      </div>
    </aside>
  );
}

export function TemplatesLibrary({ templates }: { templates: Template[] }) {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = activeCategory === "ALL" || template.category === activeCategory;
    const searchValues = [template.name, categoryLabels[template.category], template.subject, template.previewText];
    const matchesQuery = !normalizedQuery || searchValues.some((value) => value?.toLowerCase().includes(normalizedQuery));
    return matchesCategory && matchesQuery;
  });

  const selectedTemplate = filteredTemplates.find((template) => template.id === selectedId) ?? filteredTemplates[0];
  const openTemplate = templates.find((template) => template.id === openTemplateId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (openTemplate && dialog && !dialog.open) dialog.showModal();
    if (!openTemplate && dialog?.open) dialog.close();
  }, [openTemplate]);

  function handleOpenTemplate(template: Template) {
    setSelectedId(template.id);
    setOpenTemplateId(template.id);
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 pb-8">
      <TemplatesHeader />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TemplateFilters activeCategory={activeCategory} onChange={setActiveCategory} />
        <TemplateSearch value={query} onChange={setQuery} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-label="Template library">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] font-medium text-text-secondary">Template library <span className="text-text-tertiary">· {filteredTemplates.length} designs</span></p>
            <span className="hidden text-[12px] text-text-tertiary sm:inline">Select a design to preview</span>
          </div>
          {filteredTemplates.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-[8px] border border-dashed border-border-strong bg-surface text-center">
              <Search size={22} className="text-text-tertiary" />
              <p className="mt-3 text-[14px] font-semibold text-text-primary">No matching templates</p>
              <p className="mt-1 text-[13px] text-text-secondary">Try another search or choose a different category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} selected={selectedTemplate?.id === template.id} onOpen={handleOpenTemplate} />
              ))}
            </div>
          )}
        </section>

        <TemplateInspector template={selectedTemplate} />
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="template-dialog-title"
        onClose={() => setOpenTemplateId(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpenTemplateId(null);
        }}
        className="max-h-[92vh] w-[min(94vw,760px)] overflow-y-auto rounded-[12px] border border-border bg-surface p-0 text-text-primary shadow-[0_16px_48px_rgba(15,23,42,0.18)] backdrop:bg-slate-950/45"
      >
        {openTemplate && (
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold text-text-tertiary">{categoryLabels[openTemplate.category] ?? "Custom"}</p>
                <h2 id="template-dialog-title" className="mt-1 text-[20px] font-bold text-text-primary">{openTemplate.name}</h2>
                <p className="mt-1 text-[13px] text-text-secondary">{replaceBusinessName(openTemplate.subject || openTemplate.previewText || "Email preview")}</p>
              </div>
              <button type="button" autoFocus onClick={() => setOpenTemplateId(null)} aria-label="Close template preview" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border text-text-secondary hover:bg-surface-secondary hover:text-text-primary">
                <X size={17} />
              </button>
            </div>
            <TemplatePreview template={openTemplate} size="large" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[12px] text-text-secondary">{openTemplate.blocks.length} content blocks</p>
              <Link href={`/templates/${openTemplate.id}/edit`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] bg-white px-3 text-[13px] font-semibold text-[#10254A] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
                <Plus size={14} /> Edit template
              </Link>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}