"use client";

import * as React from "react";
import { useActionState } from "react";
import { scheduleCampaignAction, type ScheduleState } from "@/lib/actions/campaign-actions";
import { ErrorBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function ScheduleForm({ campaignId }: { campaignId: string }) {
  const [state, formAction, pending] = useActionState<ScheduleState, FormData>(scheduleCampaignAction, undefined);
  const [min] = React.useState(() => new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16));

  return (
    <form action={formAction} className="space-y-3">
      <ErrorBanner message={state?.error} />
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="flex gap-2">
        <input
          type="datetime-local"
          name="scheduledAt"
          min={min}
          required
          className="h-9 flex-1 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-[13.5px] text-text-primary outline-none focus:border-primary"
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Scheduling…" : "Schedule"}
        </Button>
      </div>
      <p className="text-[12px] text-text-tertiary">
        Scheduled sends are queued by a background worker — not wired up to a live scheduler in this environment.
      </p>
    </form>
  );
}
