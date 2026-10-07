"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updateContentDetailsAction } from "@/lib/actions/campaign-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function ContentDetailsForm({
  campaign,
  verifiedDomains = [],
}: {
  /** Lower-case domains this workspace has verified for sending. */
  verifiedDomains?: string[];
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

  const [fromEmail, setFromEmail] = useState(campaign.fromEmail);
  const fromDomain = fromEmail.split("@")[1]?.trim().toLowerCase() ?? "";
  const hasValidAddress = fromEmail.includes("@") && fromDomain.includes(".");
  const onVerifiedDomain = verifiedDomains.includes(fromDomain);

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
          <Input
            id="fromEmail"
            name="fromEmail"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            required
          />
        </Field>
      </div>

      {hasValidAddress && (
        <p
          className={`rounded-[10px] px-3 py-2 text-[12px] leading-[1.5] ${
            onVerifiedDomain ? "bg-success-surface text-success" : "bg-surface-secondary text-text-secondary"
          }`}
        >
          {onVerifiedDomain ? (
            <>Verified domain: emails will be sent from this address.</>
          ) : (
            <>
              <strong>{fromDomain}</strong> isn&apos;t a verified sending domain, so emails go out from Zendmail&apos;s shared
              address and replies come to this address.{" "}
              <Link href="/workspace/domains" className="font-semibold text-primary underline">
                Verify your domain
              </Link>
            </>
          )}
        </p>
      )}

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
