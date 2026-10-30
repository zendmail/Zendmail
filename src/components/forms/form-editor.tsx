"use client";

import * as React from "react";
import { useActionState } from "react";
import { updateSignupFormAction } from "@/lib/actions/signup-form-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";
import { PublicSignupForm } from "@/components/forms/public-signup-form";

export type EditableForm = {
  id: string;
  publicId: string;
  name: string;
  title: string;
  description: string;
  buttonLabel: string;
  successMessage: string;
  collectName: boolean;
  consentText: string;
  doubleOptIn: boolean;
  accentColor: string;
};

const textareaClass =
  "w-full rounded-[11px] border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[var(--shadow-focus-primary)]";

export function FormEditor({ form }: { form: EditableForm }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSignupFormAction, undefined);
  const [v, setV] = React.useState(form);
  const set = <K extends keyof EditableForm>(key: K, value: EditableForm[K]) => setV((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <form action={action} className="space-y-4">
        <input type="hidden" name="formId" value={form.id} />
        <ErrorBanner message={state?.error} />
        <SuccessBanner message={state?.success} />

        <Field label="Form name (only you see this)" htmlFor="name">
          <Input id="name" name="name" value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={80} required />
        </Field>
        <Field label="Headline" htmlFor="title">
          <Input id="title" name="title" value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={100} required />
        </Field>
        <Field label="Description" htmlFor="description">
          <textarea id="description" name="description" rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={300} className={textareaClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Button text" htmlFor="buttonLabel">
            <Input id="buttonLabel" name="buttonLabel" value={v.buttonLabel} onChange={(e) => set("buttonLabel", e.target.value)} maxLength={30} required />
          </Field>
          <Field label="Accent colour" htmlFor="accentColor">
            <input id="accentColor" name="accentColor" type="color" value={v.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="h-11 w-full min-w-[84px] cursor-pointer rounded-[11px] border border-border bg-surface p-1" />
          </Field>
        </div>
        <Field label="Consent wording (what people agree to)" htmlFor="consentText">
          <textarea id="consentText" name="consentText" rows={2} value={v.consentText} onChange={(e) => set("consentText", e.target.value)} maxLength={300} required className={textareaClass} />
        </Field>
        <Field label="Message after signup (optional)" htmlFor="successMessage">
          <Input id="successMessage" name="successMessage" value={v.successMessage} onChange={(e) => set("successMessage", e.target.value)} maxLength={200} placeholder="Leave empty for the default message" />
        </Field>

        <div className="space-y-3 rounded-[12px] border border-border bg-surface-secondary/60 p-4">
          <label className="flex items-start gap-3 text-[13.5px] text-text-primary">
            <input type="checkbox" name="collectName" checked={v.collectName} onChange={(e) => set("collectName", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
            <span><strong className="font-semibold">Ask for first name</strong><br /><span className="text-text-secondary">Lets you personalise emails (&ldquo;Hi Jane&rdquo;).</span></span>
          </label>
          <label className="flex items-start gap-3 text-[13.5px] text-text-primary">
            <input type="checkbox" name="doubleOptIn" checked={v.doubleOptIn} onChange={(e) => set("doubleOptIn", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
            <span>
              <strong className="font-semibold">Double opt-in (recommended)</strong><br />
              <span className="text-text-secondary">
                People confirm by clicking a link we email them. Fewer fake or mistyped addresses, fewer spam complaints, and
                the strongest proof of consent. The welcome email is sent after they confirm.
              </span>
            </span>
          </label>
        </div>

        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </form>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Live preview</p>
        <div className="rounded-[18px] border border-border bg-surface p-6 shadow-[0_8px_30px_rgba(16,21,28,0.06)]">
          <PublicSignupForm
            key={`${v.collectName}`}
            publicId={form.publicId}
            title={v.title}
            description={v.description}
            buttonLabel={v.buttonLabel}
            collectName={v.collectName}
            consentText={v.consentText}
            accentColor={v.accentColor}
            preview
          />
        </div>
      </div>
    </div>
  );
}
