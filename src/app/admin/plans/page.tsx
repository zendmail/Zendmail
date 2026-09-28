import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanEditForm } from "@/components/admin/plan-edit-form";
import { db } from "@/db/client";
import { plans } from "@/db/schema";

export default async function AdminPlansPage() {
  const allPlans = await db.select().from(plans);

  return (
    <div className="max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Plans</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          Edit pricing and usage limits. Changes apply to all workspaces on this plan going forward.
        </p>
      </div>

      <div className="space-y-4">
        {allPlans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5">
              <PlanEditForm
                plan={{
                  id: plan.id,
                  name: plan.name,
                  priceMonthly: plan.priceMonthly,
                  contactLimit: plan.contactLimit,
                  emailSendLimit: plan.emailSendLimit,
                  aiGenerationLimit: plan.aiGenerationLimit,
                }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
