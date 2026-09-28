"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { createCheckoutSession, createPortalSession } from "@/lib/billing/checkout";
import { isBillingConfigured } from "@/lib/billing/stripe-client";

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspace };
}

export type BillingActionState = { error?: string } | undefined;

export async function startCheckoutAction(
  _prev: BillingActionState,
  formData: FormData
): Promise<BillingActionState> {
  const { userId, workspace } = await requireWorkspace();
  const planKey = String(formData.get("planKey"));

  if (!isBillingConfigured()) {
    return { error: "Billing isn't connected yet — set STRIPE_SECRET_KEY in your environment to enable upgrades." };
  }

  let url: string;
  try {
    url = await createCheckoutSession(workspace.id, planKey);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't start checkout." };
  }

  await recordAuditLog({ action: "billing.checkout_started", userId, workspaceId: workspace.id, metadata: { planKey } });
  redirect(url);
}

export async function openBillingPortalAction(): Promise<BillingActionState> {
  const { userId, workspace } = await requireWorkspace();

  if (!isBillingConfigured()) {
    return { error: "Billing isn't connected yet — set STRIPE_SECRET_KEY in your environment to enable this." };
  }

  let url: string;
  try {
    url = await createPortalSession(workspace.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't open the billing portal." };
  }

  await recordAuditLog({ action: "billing.portal_opened", userId, workspaceId: workspace.id });
  redirect(url);
}
