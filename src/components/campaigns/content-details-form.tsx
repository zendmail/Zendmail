"use client";

import { useActionState } from "react";
import { updateContentDetailsAction } from "@/lib/actions/campaign-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function ContentDetailsForm({
  campaign,
  verifiedSenders = [],
}: {
  /** Verified sending identities in this workspace, offered as From-address suggestions. */
  verifiedSenders?: { fromEmail: string; fromName: string }[];
  campaign: {
    id: string;
    name: string;
    fromName: string;
    fromEmail: string;
    replyTo: string | null;
    subject: string;
    previewText: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateContentDetailsAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <input type="hidden" name="campaignId" value={campaign.id} />

      <Field label="Campaign name" htmlFor="name">
        <Input id="name" name="name" defaultValue={campaign.name} required />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="From name" htmlFor="fromName">
          <Input id="fromName" name="fromName" defaultValue={campaign.fromName} required />
        </Field>
        <Field label="From email" htmlFor="fromEmail">
          <Input id="fromEmail" name="fromEmail" type="email" list="verified-senders" defaultValue={campaign.fromEmail} required />
          <datalist id="verified-senders">
            {verifiedSenders.map((s) => (
              <option key={s.fromEmail} value={s.fromEmail}>
                {s.fromName}
              </option>
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="Reply-to (optional)" htmlFor="replyTo">
        <Input id="replyTo" name="replyTo" type="email" defaultValue={campaign.replyTo ?? ""} />
      </Field>

      <Field label="Subject line" htmlFor="subject">
        <Input id="subject" name="subject" defaultValue={campaign.subject} required />
      </Field>

      <Field label="Preview text" htmlFor="previewText">
        <Input id="previewText" name="previewText" defaultValue={campaign.previewText ?? ""} />
      </Field>

      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
