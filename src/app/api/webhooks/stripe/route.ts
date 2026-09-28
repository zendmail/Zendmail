import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db/client";
import { subscriptions, plans, webhookEvents } from "@/db/schema";
import { getStripeClient } from "@/lib/billing/stripe-client";

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    // Never process an unverified payload — this is the one check that
    // stands between this endpoint and anyone on the internet being able
    // to forge subscription state.
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: Stripe retries delivery until it gets a 2xx, so the same
  // event id can arrive more than once. Record-then-skip on conflict.
  const [existing] = await db.select({ id: webhookEvents.id }).from(webhookEvents).where(eq(webhookEvents.id, event.id)).limit(1);
  if (existing) {
    return NextResponse.json({ received: true, deduped: true });
  }
  await db.insert(webhookEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();

  try {
    await handleEvent(event);
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type} (${event.id}):`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id;
      const planKey = session.metadata?.planKey;
      if (!workspaceId || !planKey) return;

      const [plan] = await db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
      if (!plan) return;

      await db
        .update(subscriptions)
        .set({
          planId: plan.id,
          status: "ACTIVE",
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.workspaceId, workspaceId));
      return;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata?.workspaceId;
      if (!workspaceId) return;

      const status = event.type === "customer.subscription.deleted" ? "CANCELED" : mapStripeStatus(sub.status);

      await db
        .update(subscriptions)
        .set({
          status,
          currentPeriodEnd: sub.items.data[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000)
            : undefined,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.workspaceId, workspaceId));
      return;
    }

    default:
      return; // ignore events we don't act on
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
      return "ACTIVE" as const;
    case "trialing":
      return "TRIALING" as const;
    case "past_due":
    case "unpaid":
      return "PAST_DUE" as const;
    default:
      return "CANCELED" as const;
  }
}
