"use client";

import { useActionState } from "react";
import { saveBusinessInfoAction } from "@/lib/actions/onboarding-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner } from "@/components/auth/form-elements";
import { Select } from "@/components/auth/select";
import { Button } from "@/components/ui/button";

const industries = [
  "Apparel & fashion",
  "Beauty & cosmetics",
  "Health & wellness",
  "Home & furniture",
  "Food & beverage",
  "Electronics",
  "Outdoor & sporting goods",
  "Media & publishing",
  "Software & SaaS",
  "Other",
];

const countries = ["United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Other"];
const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "UTC",
];

export function BusinessInfoForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveBusinessInfoAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <Field label="Business name" htmlFor="businessName">
        <Input id="businessName" name="businessName" placeholder="Northwood Outdoor Co." required />
      </Field>
      <Field label="Website" htmlFor="website">
        <Input id="website" name="website" placeholder="https://yourstore.com" />
      </Field>
      <Field label="Industry" htmlFor="industry">
        <Select id="industry" name="industry" required defaultValue="">
          <option value="" disabled>
            Select an industry
          </option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Country" htmlFor="country">
          <Select id="country" name="country" required defaultValue="">
            <option value="" disabled>
              Select
            </option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Currency" htmlFor="currency">
          <Select id="currency" name="currency" required defaultValue="USD">
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Timezone" htmlFor="timezone">
        <Select id="timezone" name="timezone" required defaultValue="America/New_York">
          {timezones.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
