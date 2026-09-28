"use client";

import { updatePlanLimitsAction } from "@/lib/actions/admin-actions";
import { Input } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

type Plan = {
  id: string;
  name: string;
  priceMonthly: string | null;
  contactLimit: number | null;
  emailSendLimit: number | null;
  aiGenerationLimit: number | null;
};

export function PlanEditForm({ plan }: { plan: Plan }) {
  return (
    <form action={updatePlanLimitsAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <input type="hidden" name="planId" value={plan.id} />
      <label className="space-y-1">
        <span className="text-[11px] text-text-tertiary">Price / mo</span>
        <Input name="priceMonthly" type="number" step="1" defaultValue={plan.priceMonthly ?? ""} />
      </label>
      <label className="space-y-1">
        <span className="text-[11px] text-text-tertiary">Contact limit</span>
        <Input name="contactLimit" type="number" defaultValue={plan.contactLimit ?? ""} />
      </label>
      <label className="space-y-1">
        <span className="text-[11px] text-text-tertiary">Email send limit</span>
        <Input name="emailSendLimit" type="number" defaultValue={plan.emailSendLimit ?? ""} />
      </label>
      <label className="space-y-1">
        <span className="text-[11px] text-text-tertiary">AI generation limit</span>
        <Input name="aiGenerationLimit" type="number" defaultValue={plan.aiGenerationLimit ?? ""} />
      </label>
      <div className="col-span-2 sm:col-span-4">
        <Button type="submit" size="sm" variant="secondary">
          Save
        </Button>
      </div>
    </form>
  );
}
