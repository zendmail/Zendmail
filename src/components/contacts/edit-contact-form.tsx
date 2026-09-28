"use client";

import { useActionState } from "react";
import { updateContactAction } from "@/lib/actions/contact-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
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

export function EditContactForm({
  contact,
}: {
  contact: { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null; status: string };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateContactAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <input type="hidden" name="id" value={contact.id} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={contact.email} required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" htmlFor="firstName">
          <Input id="firstName" name="firstName" defaultValue={contact.firstName ?? ""} />
        </Field>
        <Field label="Last name" htmlFor="lastName">
          <Input id="lastName" name="lastName" defaultValue={contact.lastName ?? ""} />
        </Field>
      </div>
      <Field label="Phone" htmlFor="phone">
        <Input id="phone" name="phone" defaultValue={contact.phone ?? ""} />
      </Field>
      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={contact.status}>
          {contactStatusValues.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
