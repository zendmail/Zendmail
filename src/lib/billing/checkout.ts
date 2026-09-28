import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions, plans, workspaces } from "@/db/schema";
import { getStripeClient } from "./stripe-client";
import { appUrl } from "@/lib/app-url";

export async function createCheckoutSession(workspaceId: string, planKey: string) {
  const [plan] = await db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
  if (!plan) throw new Error("Unknown plan.");
  if (!plan.stripePriceId) {
    throw new Error(
      `The "${plan.name}" plan isn't linked to a Stripe price yet. Create the price in Stripe and set plans.stripePriceId.`
    );
  }

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const [existingSub] = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).limit(1);

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    customer: existingSub?.stripeCustomerId ?? undefined,
    client_reference_id: workspaceId,
    success_url: appUrl("/workspace/billing?checkout=success"),
    cancel_url: appUrl("/workspace/billing?checkout=cancelled"),
    metadata: { workspaceId, planKey },
    subscription_data: { metadata: { workspaceId, planKey } },
  });

  void workspace; // reserved for prefilling customer details once a real Stripe account is connected

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export async function createPortalSession(workspaceId: string) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).limit(1);
  if (!sub?.stripeCustomerId) {
    throw new Error("No billing account found yet — subscribe to a paid plan first.");
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: appUrl("/workspace/billing"),
  });

  return session.url;
}
