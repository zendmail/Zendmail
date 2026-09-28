"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { signUpAction, type ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signUpAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <Field label="Full name" htmlFor="name">
        <Input id="name" name="name" type="text" autoComplete="name" placeholder="Jamie Rivera" required />
      </Field>
      <Field label="Work email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
      </Field>
      <Field label="Password" htmlFor="password">
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
      <Button type="submit" className="h-[52px] w-full rounded-[11px] text-[15px] font-bold" disabled={pending}>
        {pending ? <LoaderCircle size={17} className="animate-spin" /> : null}
        {pending ? "Creating account..." : "Create account"}
      </Button>
      <SocialAuthButtons />
    </form>
  );
}
