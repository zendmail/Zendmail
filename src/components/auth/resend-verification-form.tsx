"use client";

import { useActionState } from "react";
import { resendVerificationEmailAction } from "@/lib/actions/auth-actions";
import { SuccessBanner, ErrorBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/auth-actions";

export function ResendVerificationForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async () => resendVerificationEmailAction(),
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col items-center gap-3">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Resend verification email"}
      </Button>
    </form>
  );
}
