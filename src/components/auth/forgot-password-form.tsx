"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    forgotPasswordAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
