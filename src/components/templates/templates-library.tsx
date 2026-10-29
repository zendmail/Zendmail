"use client";

import * as React from "react";
import Link from "next/link";
import { Crown, Eye, PencilRuler, Trash2, LayoutTemplate, Lock, Plus, Search, Sparkles } from "lucide-react";
import { categoryLabels, templateCategories } from "@/components/templates/template-catalog";
import { TemplateModal, TemplateThumb } from "@/components/templates/template-frame";
import type { TemplateListItem } from "@/components/templates/template-types";
import { Badge } from "@/components/ui/badge";
import { createCampaignFromTemplateAction } from "@/lib/actions/campaign-actions";
import { customizeTemplateAction } from "@/lib/actions/builder-actions";
import { deleteTemplateAction } from "@/lib/actions/template-actions";

function DeleteButton({ template }: { template: TemplateListItem }) {
  const [state, action, pending] = React.useActionState(deleteTemplateAction, undefined);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${template.name}"? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="templateId" value={template.id} />
      <button
        type="submit"
        disabled={pending}
        title={state?.error ?? "Delete this template"}
        aria-label={`Delete ${template.name}`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary transition-colors hover:border-danger/40 hover:bg-danger-surface hover:text-danger disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
      {state?.error && <p role="alert" className="mt-1 max-w-[220px] text-[11.5px] text-danger">{state?.error}</p>}
    </form>
  );
}

type Tier = "ALL" | "FREE" | "PRO";

function UseButton({ template, canUsePro, full = false }: { template: TemplateListItem; canUsePro: boolean; full?: boolean }) {
  const size = `inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold transition-colors ${full ? "w-full" : ""}`;
  if (template.tier === "PRO" && !canUsePro) {
    return (
      <Link href="/workspace/billing?upgrade=templates" className={`${size} bg-[#0B1A3D] text-white hover:bg-[#13285A]`}>
        <Lock size={14} /> Upgrade to use
      </Link>
    );
  }
  return (
    <div className={`flex gap-2 ${full ? "w-full" : ""}`}>
      <form action={createCampaignFromTemplateAction} className={full ? "min-w-0 flex-1" : ""}>
        <input type="hidden" name="templateId" value={template.id} />
        <button type="submit" className={`${size} bg-primary text-white hover:bg-primary-hover`}>
          Use this template
        </button>
      </form>
      <form action={customizeTemplateAction}>
        <input type="hidden" name="templateId" value={template.id} />
        <button type="submit" title="Open in the visual editor" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface px-3.5 text-[13px] font-semibold text-text-primary transition-colors hover:bg-surface-secondary">
          <PencilRuler size={14} /> {template.isBuiltIn ? "Customize" : "Edit"}
        </button>
      </form>
      {!template.isBuiltIn && <DeleteButton template={template} />}
    </div>
  );
}

export function TemplatesLibrary({ templates, canUsePro, planName }: { templates: TemplateListItem[]; canUsePro: boolean; planName: string }) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("ALL");
  const [tier, setTier] = React.useState<Tier>("ALL");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const freeCount = templates.filter((t) => t.tier === "FREE").length;
  const proCount = templates.filter((t) => t.tier === "PRO").length;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (tier !== "ALL" && t.tier !== tier) return false;
      if (category !== "ALL" && t.category !== category) return false;
      if (!q) return true;
      return [t.name, t.description ?? "", categoryLabels[t.category] ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [templates, query, category, tier]);

  const open = templates.find((t) => t.id === openId) ?? null;
  const onClose = React.useCallback(() => setOpenId(null), []);

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-surface text-primary">
            <LayoutTemplate size={21} />
          </span>
          <div>
            <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Email templates</h1>
            <p className="mt-0.5 text-[13.5px] text-text-secondary">
              {freeCount} free · {proCount} Pro — professionally designed, fully editable, and ready for your brand colours.
            </p>
          </div>
        </div>
        <Link href="/templates/create" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-border bg-surface px-4 text-[13px] font-semibold text-text-primary hover:bg-surface-secondary">
          <Plus size={16} /> Create template
        </Link>
      </header>

      {!canUsePro && proCount > 0 && (
        <div className="flex flex-col gap-3 rounded-[16px] bg-[linear-gradient(110deg,#0B2C61,#0B5FFF)] p-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15"><Crown size={19} /></span>
            <div>
              <p className="text-[14.5px] font-bold">Unlock {proCount} Pro templates</p>
              <p className="text-[12.5px] text-white/80">You&apos;re on the {planName} plan. Preview any design — upgrade to start using Pro layouts.</p>
            </div>
          </div>
          <Link href="/workspace/billing?upgrade=templates" className="inline-flex h-10 shrink-0 items-center justify-center rounded-[10px] bg-white px-5 text-[13px] font-semibold text-[#0B3FBF] hover:bg-white/90">
            See plans
          </Link>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-full rounded-[12px] border border-border bg-surface p-1 lg:w-auto" role="group" aria-label="Filter by plan">
            {([["ALL", `All (${templates.length})`], ["FREE", `Free (${freeCount})`], ["PRO", `Pro (${proCount})`]] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={tier === value} onClick={() => setTier(value)} className={`h-9 flex-1 rounded-[9px] px-4 text-[13px] font-semibold lg:flex-none ${tier === value ? "bg-primary text-white" : "text-text-secondary hover:bg-surface-secondary"}`}>
                {value === "PRO" && <Crown size={12} className="mr-1 inline -translate-y-px" />}
                {label}
              </button>
            ))}
          </div>
          <label className="flex h-10 w-full items-center gap-2 rounded-[12px] border border-border bg-surface px-3 text-text-tertiary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 lg:max-w-[280px]">
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates" aria-label="Search templates" className="min-w-0 flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary" />
          </label>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
          {[{ value: "ALL", label: "All categories" }, ...templateCategories].map(({ value, label }) => (
            <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold ${category === value ? "border-primary bg-primary-surface text-primary" : "border-border bg-surface text-text-secondary hover:border-border-strong"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border px-6 py-14 text-center">
          <Sparkles className="mx-auto text-text-tertiary" size={22} />
          <p className="mt-3 text-[14.5px] font-bold text-text-primary">No templates match</p>
          <p className="mt-1 text-[13px] text-text-secondary">Try a different search or category.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <li key={t.id} className="group flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface shadow-[var(--shadow-xs)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
              <button type="button" onClick={() => setOpenId(t.id)} className="relative block text-left" aria-label={`Preview ${t.name}`}>
                <TemplateThumb id={t.id} name={t.name} />
                <span className="absolute left-3 top-3 flex gap-1.5">
                  <Badge tone={t.tier === "PRO" ? "primary" : "success"} className="bg-white/95 shadow-[var(--shadow-xs)]">
                    {t.tier === "PRO" ? <><Crown size={11} className="mr-1 inline" />Pro</> : "Free"}
                  </Badge>
                </span>
                <span className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-[#0B1A3D]/55 to-transparent pb-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-text-primary"><Eye size={14} /> Preview</span>
                </span>
              </button>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">{categoryLabels[t.category] ?? t.category}</p>
                  <h2 className="mt-1 text-[15px] font-bold leading-snug text-text-primary">{t.name}</h2>
                  {t.description && <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.5] text-text-secondary">{t.description}</p>}
                </div>
                <div className="mt-auto">
                  <UseButton template={t} canUsePro={canUsePro} full />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <TemplateModal
          id={open.id}
          name={open.name}
          description={open.description}
          tier={open.tier}
          subject={open.subject}
          onClose={onClose}
          footer={<UseButton template={open} canUsePro={canUsePro} />}
        />
      )}
    </div>
  );
}
