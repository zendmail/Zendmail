"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <div className="space-y-1.5">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            required
          />
          <div className="text-right">
            <Link href="/forgot-password" className="text-[12.5px] text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
