"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitSignupFormAction } from "@/lib/actions/signup-form-actions";
import type { ActionState } from "@/lib/actions/auth-actions";

export type PublicFormProps = {
  publicId: string;
  title: string;
  description: string;
  buttonLabel: string;
  collectName: boolean;
  consentText: string;
  accentColor: string;
  /** Preview in the dashboard: renders the same form but cannot submit. */
  preview?: boolean;
};

const fieldClass =
  "h-11 w-full rounded-[11px] border border-border bg-surface px-3.5 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]";

export function PublicSignupForm({ publicId, title, description, buttonLabel, collectName, consentText, accentColor, preview = false }: PublicFormProps) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitSignupFormAction, undefined);
  const style = { "--accent": accentColor } as React.CSSProperties;

  if (state?.success) {
    return (
      <div style={style} role="status" className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 size={38} style={{ color: accentColor }} />
        <p className="text-[16px] font-semibold text-text-primary">{state.success}</p>
      </div>
    );
  }

  return (
    <form
      action={preview ? undefined : action}
      onSubmit={preview ? (e) => e.preventDefault() : undefined}
      style={style}
      className="space-y-4"
    >
      <div>
        <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-text-primary">{title}</h1>
        {description && <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">{description}</p>}
      </div>

      <input type="hidden" name="publicId" value={publicId} />
      {/* Honeypot: hidden from people, tempting for bots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Company website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {collectName && (
        <div>
          <label htmlFor={`fn-${publicId}`} className="mb-1.5 block text-[13px] font-semibold text-text-primary">First name</label>
          <input id={`fn-${publicId}`} name="firstName" autoComplete="given-name" maxLength={80} className={fieldClass} placeholder="Jane" />
        </div>
      )}
      <div>
        <label htmlFor={`em-${publicId}`} className="mb-1.5 block text-[13px] font-semibold text-text-primary">Email</label>
        <input id={`em-${publicId}`} name="email" type="email" required autoComplete="email" maxLength={254} className={fieldClass} placeholder="jane@example.com" />
      </div>

      <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-text-secondary">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor }} />
        <span>{consentText}</span>
      </label>

      {state?.error && (
        <p role="alert" className="rounded-[10px] bg-danger-surface px-3 py-2.5 text-[13px] text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{ backgroundColor: accentColor }}
        className="h-11 w-full rounded-[11px] text-[14.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Please wait…" : buttonLabel}
      </button>
    </form>
  );
}
