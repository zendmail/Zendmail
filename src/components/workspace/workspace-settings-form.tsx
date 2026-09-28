"use client";

import { useActionState } from "react";
import { updateWorkspaceSettingsAction } from "@/lib/actions/workspace-settings-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Select } from "@/components/auth/select";
import { Button } from "@/components/ui/button";

const industries = [
  "Apparel & fashion", "Beauty & cosmetics", "Health & wellness", "Home & furniture",
  "Food & beverage", "Electronics", "Outdoor & sporting goods", "Media & publishing",
  "Software & SaaS", "Other",
];
const countries = ["United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Other"];
const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
const timezones = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "UTC",
];

export function WorkspaceSettingsForm({
  workspace,
}: {
  workspace: {
    name: string;
    website: string | null;
    industry: string | null;
    country: string | null;
    currency: string;
    timezone: string;
  };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateWorkspaceSettingsAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <Field label="Business name" htmlFor="businessName">
        <Input id="businessName" name="businessName" defaultValue={workspace.name} required />
      </Field>
      <Field label="Website" htmlFor="website">
        <Input id="website" name="website" defaultValue={workspace.website ?? ""} placeholder="https://yourstore.com" />
      </Field>
      <Field label="Industry" htmlFor="industry">
        <Select id="industry" name="industry" defaultValue={workspace.industry ?? ""} required>
          <option value="" disabled>Select an industry</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Country" htmlFor="country">
          <Select id="country" name="country" defaultValue={workspace.country ?? ""} required>
            <option value="" disabled>Select</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Currency" htmlFor="currency">
          <Select id="currency" name="currency" defaultValue={workspace.currency}>
            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Timezone" htmlFor="timezone">
        <Select id="timezone" name="timezone" defaultValue={workspace.timezone}>
          {timezones.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
