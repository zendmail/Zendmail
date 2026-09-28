"use client";

import { useActionState } from "react";
import { openBillingPortalAction, type BillingActionState } from "@/lib/actions/billing-actions";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/auth/form-elements";

export function ManageBillingButton() {
  const [state, formAction, pending] = useActionState<BillingActionState, FormData>(openBillingPortalAction, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <ErrorBanner message={state?.error} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Opening…" : "Manage billing"}
      </Button>
    </form>
  );
}
