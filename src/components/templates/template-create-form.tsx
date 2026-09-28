"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBanner, Field, Input } from "@/components/auth/form-elements";
import { createTemplateAction } from "@/lib/actions/template-actions";
import { templateCategories } from "@/components/templates/template-catalog";

export function TemplateCreateForm() {
  const [state, formAction, pending] = useActionState(createTemplateAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <ErrorBanner message={state?.error} />
      <Field label="Template name" htmlFor="name">
        <Input id="name" name="name" required minLength={2} maxLength={80} placeholder="e.g. New customer welcome" />
      </Field>

      <Field label="Category" htmlFor="category">
        <select
          id="category"
          name="category"
          required
          defaultValue="WELCOME"
          className="h-11 w-full rounded-[8px] border border-border bg-surface px-3.5 text-[14px] text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          {templateCategories.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>

      <Field label="Email subject" htmlFor="subject">
        <Input id="subject" name="subject" required maxLength={120} placeholder="A subject your audience will open" />
      </Field>

      <Field label="Preview text" htmlFor="previewText">
        <Input id="previewText" name="previewText" maxLength={160} placeholder="A short line shown beside the subject" />
      </Field>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="submit" size="md" disabled={pending} className="text-[13px]">
          {pending && <LoaderCircle size={15} className="animate-spin" />}
          Create template
        </Button>
      </div>
    </form>
  );
}