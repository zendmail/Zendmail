"use client";

import { useActionState } from "react";
import { updateLandingSettingsAction } from "@/lib/actions/landing-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

const textareaClass =
  "w-full rounded-[11px] border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[var(--shadow-focus-primary)]";

export function LandingSettings({
  page,
  forms,
}: {
  page: { id: string; name: string; seoTitle: string; seoDescription: string; formId: string | null };
  forms: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateLandingSettingsAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="pageId" value={page.id} />
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <Field label="Page name (only you see this)" htmlFor="name">
        <Input id="name" name="name" defaultValue={page.name} maxLength={80} required />
      </Field>
      <Field label="Page title (browser tab and search results)" htmlFor="seoTitle">
        <Input id="seoTitle" name="seoTitle" defaultValue={page.seoTitle} maxLength={70} />
      </Field>
      <Field label="Short description (search and social previews)" htmlFor="seoDescription">
        <textarea id="seoDescription" name="seoDescription" rows={2} defaultValue={page.seoDescription} maxLength={160} className={textareaClass} />
      </Field>
      <Field label="Signup form shown under the page" htmlFor="formId">
        <select id="formId" name="formId" defaultValue={page.formId ?? ""} className="h-11 w-full rounded-[11px] border border-border bg-surface px-3 text-[14px] text-text-primary outline-none focus:border-primary focus:shadow-[var(--shadow-focus-primary)]">
          <option value="">No form</option>
          {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <p className="mt-1.5 text-[12.5px] text-text-secondary">
          {forms.length === 0 ? "Create a signup form first (Forms), then pick it here." : "Visitors subscribe with consent, exactly like your hosted form. Buttons that link to “#signup” scroll to it."}
        </p>
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
    </form>
  );
}
