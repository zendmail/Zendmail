import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsageBar } from "@/components/billing/usage-bar";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getWorkspaceSubscription, listPlans, getWorkspaceUsage } from "@/lib/billing/usage";
import { isBillingConfigured } from "@/lib/billing/stripe-client";
import { formatCurrency } from "@/lib/utils";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [subscriptionRow, plans, usage] = await Promise.all([
    getWorkspaceSubscription(workspace.id),
    listPlans(),
    getWorkspaceUsage(workspace.id),
  ]);

  const currentPlan = subscriptionRow?.plan;
  const subscription = subscriptionRow?.subscription;
  const configured = isBillingConfigured();

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Billing</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Manage your plan, usage, and payment details.</p>
      </div>

      {!configured && (
        <Card className="border-warning-surface bg-warning-surface/40 p-4">
          <p className="text-[13px] text-text-primary">
            Billing isn&apos;t connected in this environment — set <code>STRIPE_SECRET_KEY</code> and{" "}
            <code>STRIPE_WEBHOOK_SECRET</code> to enable checkout, the billing portal, and live subscription sync.
          </p>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold text-text-primary">{currentPlan?.name ?? "Free"} plan</p>
              {subscription && <Badge tone={subscription.status === "ACTIVE" ? "success" : "warning"}>{subscription.status}</Badge>}
            </div>
            <p className="mt-0.5 text-[13px] text-text-secondary">
              {currentPlan?.priceMonthly ? `${formatCurrency(Number(currentPlan.priceMonthly))}/month` : "No cost"}
              {subscription?.currentPeriodEnd &&
                ` · renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          </div>
          <ManageBillingButton />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Usage this month</CardTitle>
            <CardDescription>Resets on the 1st of each month.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label="Contacts" used={usage.contacts} limit={currentPlan?.contactLimit ?? null} />
          <UsageBar label="Emails sent" used={usage.emailsSent} limit={currentPlan?.emailSendLimit ?? null} />
          <UsageBar
            label="Automation executions"
            used={usage.automationExecutions}
            limit={currentPlan?.aiGenerationLimit ?? null}
          />
          <UsageBar label="AI generations" used={usage.aiGenerations} limit={currentPlan?.aiGenerationLimit ?? null} />
          <UsageBar label="Connected stores" used={usage.connectedStores} limit={currentPlan?.connectedStoreLimit ?? null} />
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 text-[15px] font-semibold text-text-primary">Plans</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.key === plan.key;
            return (
              <Card key={plan.id} className={`p-4 ${isCurrent ? "border-primary" : ""}`}>
                <p className="text-[13.5px] font-semibold text-text-primary">{plan.name}</p>
                <p className="mt-1 text-[20px] font-semibold text-text-primary">
                  {plan.priceMonthly ? formatCurrency(Number(plan.priceMonthly)) : "Custom"}
                  {plan.priceMonthly && <span className="text-[12px] font-normal text-text-tertiary">/mo</span>}
                </p>
                <ul className="mt-3 space-y-1.5 text-[12px] text-text-secondary">
                  {(plan.features ?? []).slice(0, 3).map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <div className="mt-4">
                  {plan.key === "enterprise" ? (
                    <p className="text-center text-[12px] text-text-tertiary">Contact sales</p>
                  ) : (
                    <CheckoutButton planKey={plan.key} isCurrent={isCurrent} label="Choose plan" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt size={24} className="text-text-tertiary" />
            <p className="text-[13px] text-text-secondary">
              {configured
                ? "No invoices yet."
                : "Invoices will appear here once Stripe is connected and you're on a paid plan."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
