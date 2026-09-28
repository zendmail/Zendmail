"use client";

import { useActionState } from "react";
import { createContactAction } from "@/lib/actions/contact-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner } from "@/components/auth/form-elements";
import { Select } from "@/components/auth/select";
import { Button } from "@/components/ui/button";
import { contactStatusValues } from "@/lib/validation/contacts";

const statusLabels: Record<string, string> = {
  SUBSCRIBER: "Subscriber",
  CUSTOMER: "Customer",
  LEAD: "Lead",
  VIP: "VIP",
  INACTIVE: "Inactive",
  UNSUBSCRIBED: "Unsubscribed",
  BOUNCED: "Bounced",
};

export function NewContactForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createContactAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" placeholder="jane@example.com" required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" htmlFor="firstName">
          <Input id="firstName" name="firstName" placeholder="Jane" />
        </Field>
        <Field label="Last name" htmlFor="lastName">
          <Input id="lastName" name="lastName" placeholder="Doe" />
        </Field>
      </div>
      <Field label="Phone" htmlFor="phone">
        <Input id="phone" name="phone" placeholder="+1 (555) 000-0000" />
      </Field>
      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue="SUBSCRIBER">
          {contactStatusValues.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add contact"}
      </Button>
    </form>
  );
}
