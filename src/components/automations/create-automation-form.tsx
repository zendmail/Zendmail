"use client";

import * as React from "react";
import { useActionState } from "react";
import { createAutomationAction } from "@/lib/actions/automation-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { Field, Input, ErrorBanner } from "@/components/auth/form-elements";
import { Select } from "@/components/auth/select";
import { Button } from "@/components/ui/button";

export function CreateAutomationForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAutomationAction, undefined);
  const [trigger, setTrigger] = React.useState<"CONTACT_CREATED" | "TAG_ADDED">("TAG_ADDED");

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <Field label="Automation name" htmlFor="name">
        <Input id="name" name="name" placeholder="Welcome VIP customers" required />
      </Field>
      <Field label="Trigger" htmlFor="triggerType">
        <Select
          id="triggerType"
          name="triggerType"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value as typeof trigger)}
        >
          <option value="TAG_ADDED">When a tag is added to a contact</option>
          <option value="CONTACT_CREATED">When a new contact is created</option>
        </Select>
      </Field>
      {trigger === "TAG_ADDED" && (
        <Field label="Tag name" htmlFor="tagName">
          <Input id="tagName" name="tagName" placeholder="VIP" required />
        </Field>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create and add steps"}
      </Button>
    </form>
  );
}
