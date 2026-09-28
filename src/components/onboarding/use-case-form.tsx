"use client";

import { useActionState } from "react";
import { ShoppingBag, Newspaper, Building2, Code2, MoreHorizontal } from "lucide-react";
import { saveUseCaseAction } from "@/lib/actions/onboarding-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { ErrorBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as React from "react";

const options = [
  { value: "ECOMMERCE", label: "E-commerce store", icon: ShoppingBag },
  { value: "NEWSLETTER", label: "Newsletter / content", icon: Newspaper },
  { value: "AGENCY", label: "Marketing agency", icon: Building2 },
  { value: "SAAS", label: "SaaS product", icon: Code2 },
  { value: "OTHER", label: "Something else", icon: MoreHorizontal },
] as const;

export function UseCaseForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveUseCaseAction, undefined);
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <input type="hidden" name="useCase" value={selected ?? ""} />
      <div className="space-y-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => setSelected(option.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left text-[13.5px] font-medium transition-colors",
                isSelected
                  ? "border-primary bg-primary-surface text-primary"
                  : "border-border text-text-primary hover:bg-surface-secondary"
              )}
            >
              <Icon size={17} className={isSelected ? "text-primary" : "text-text-tertiary"} />
              {option.label}
            </button>
          );
        })}
      </div>
      <Button type="submit" className="w-full" disabled={pending || !selected}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
