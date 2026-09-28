"use client";

import * as React from "react";
import { useActionState } from "react";
import { Users, PieChart } from "lucide-react";
import { updateAudienceAction } from "@/lib/actions/campaign-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { ErrorBanner } from "@/components/auth/form-elements";
import { Select } from "@/components/auth/select";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";

type SegmentOption = { id: string; name: string; contactCount: number };

export function AudienceForm({
  campaignId,
  segments,
  initialType,
  initialSegmentId,
  allContactsCount,
}: {
  campaignId: string;
  segments: SegmentOption[];
  initialType: "ALL" | "SEGMENT";
  initialSegmentId: string | null;
  allContactsCount: number;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateAudienceAction, undefined);
  const [audienceType, setAudienceType] = React.useState<"ALL" | "SEGMENT">(initialType);
  const [segmentId, setSegmentId] = React.useState(initialSegmentId ?? segments[0]?.id ?? "");

  return (
    <form action={formAction} className="space-y-5">
      <ErrorBanner message={state?.error} />
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="audienceType" value={audienceType} />
      {audienceType === "SEGMENT" && <input type="hidden" name="segmentId" value={segmentId} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setAudienceType("ALL")}
          className={cn(
            "flex flex-col items-start gap-2 rounded-[var(--radius-md)] border p-4 text-left transition-colors",
            audienceType === "ALL" ? "border-primary bg-primary-surface" : "border-border hover:bg-surface-secondary"
          )}
        >
          <Users size={18} className={audienceType === "ALL" ? "text-primary" : "text-text-tertiary"} />
          <p className="text-[13.5px] font-medium text-text-primary">All contacts</p>
          <p className="text-[12.5px] text-text-secondary">{formatNumber(allContactsCount)} contacts total</p>
        </button>

        <button
          type="button"
          onClick={() => setAudienceType("SEGMENT")}
          disabled={segments.length === 0}
          className={cn(
            "flex flex-col items-start gap-2 rounded-[var(--radius-md)] border p-4 text-left transition-colors disabled:opacity-50",
            audienceType === "SEGMENT" ? "border-primary bg-primary-surface" : "border-border hover:bg-surface-secondary"
          )}
        >
          <PieChart size={18} className={audienceType === "SEGMENT" ? "text-primary" : "text-text-tertiary"} />
          <p className="text-[13.5px] font-medium text-text-primary">A segment</p>
          <p className="text-[12.5px] text-text-secondary">
            {segments.length === 0 ? "No segments created yet" : `${segments.length} available`}
          </p>
        </button>
      </div>

      {audienceType === "SEGMENT" && segments.length > 0 && (
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-text-primary">Choose a segment</label>
          <Select value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatNumber(s.contactCount)} contacts
              </option>
            ))}
          </Select>
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Continue to content"}
      </Button>
    </form>
  );
}
