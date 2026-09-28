"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <input type="hidden" name="token" value={token} />
      <Field label="New password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
