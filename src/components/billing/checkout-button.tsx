"use client";

import { useActionState } from "react";
import { startCheckoutAction, type BillingActionState } from "@/lib/actions/billing-actions";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/auth/form-elements";

export function CheckoutButton({ planKey, isCurrent, label }: { planKey: string; isCurrent: boolean; label: string }) {
  const [state, formAction, pending] = useActionState<BillingActionState, FormData>(startCheckoutAction, undefined);

  if (isCurrent) {
    return (
      <Button variant="secondary" className="w-full" disabled>
        Current plan
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <ErrorBanner message={state?.error} />
      <input type="hidden" name="planKey" value={planKey} />
      <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
        {pending ? "Redirecting…" : label}
      </Button>
    </form>
  );
}
