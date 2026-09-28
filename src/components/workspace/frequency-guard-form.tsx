"use client";

import { useActionState } from "react";
import { updateFrequencyGuardAction } from "@/lib/actions/workspace-settings-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function FrequencyGuardForm({ currentValue }: { currentValue: number }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateFrequencyGuardAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-3">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <div className="flex items-center gap-2">
        <input
          type="number"
          name="maxEmailsPerContactPerWeek"
          defaultValue={currentValue}
          min={1}
          max={50}
          className="h-9 w-24 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-[13.5px] text-text-primary outline-none focus:border-primary"
        />
        <span className="text-[13.5px] text-text-secondary">emails per contact, per rolling 7 days — across all campaigns combined</span>
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save limit"}
      </Button>
    </form>
  );
}
