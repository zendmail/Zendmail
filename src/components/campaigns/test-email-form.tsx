"use client";

import { useActionState } from "react";
import { sendTestEmailAction, type TestEmailState } from "@/lib/actions/campaign-actions";
import { Input, ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function TestEmailForm({ campaignId, defaultEmail }: { campaignId: string; defaultEmail: string }) {
  const [state, formAction, pending] = useActionState<TestEmailState, FormData>(sendTestEmailAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="flex gap-2">
        <Input name="email" type="email" defaultValue={defaultEmail} placeholder="you@company.com" required />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Sending…" : "Send test"}
        </Button>
      </div>
    </form>
  );
}
