"use client";

import { useActionState } from "react";
import { updatePostalAddressAction } from "@/lib/actions/workspace-settings-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function PostalAddressForm({ currentValue }: { currentValue: string | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updatePostalAddressAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <textarea
        name="postalAddress"
        defaultValue={currentValue ?? ""}
        rows={3}
        maxLength={300}
        placeholder={"Your Company Ltd, 12 Example Street, Dubai, United Arab Emirates"}
        className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[13.5px] text-text-primary outline-none focus:border-primary"
      />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save address"}
      </Button>
    </form>
  );
}
