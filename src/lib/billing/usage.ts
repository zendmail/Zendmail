import "server-only";
import { and, eq, sql, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, campaignRecipients, campaigns, automationRuns, automations, auditLogs, subscriptions, plans } from "@/db/schema";

export async function getWorkspaceSubscription(workspaceId: string) {
  const [row] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);
  return row ?? null;
}

export async function listPlans() {
  return db.select().from(plans).orderBy(sql`${plans.priceMonthly} asc nulls last`);
}

/** Usage counted over the current calendar month — a reasonable proxy for "billing period" without a real Stripe period synced yet. */
export async function getWorkspaceUsage(workspaceId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ count: contactCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, workspaceId), sql`${contacts.deletedAt} is null`));

  const [{ count: emailsSent }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaignRecipients)
    .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
    .where(and(eq(campaigns.workspaceId, workspaceId), eq(campaignRecipients.status, "SENT"), gte(campaignRecipients.sentAt, monthStart)));

  const [{ count: automationExecutions }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(automationRuns)
    .innerJoin(automations, eq(automationRuns.automationId, automations.id))
    .where(and(eq(automations.workspaceId, workspaceId), gte(automationRuns.createdAt, monthStart)));

  const [{ count: aiGenerations }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.workspaceId, workspaceId),
        sql`${auditLogs.action} in ('ai.email_generated', 'ai.email_transformed')`,
        gte(auditLogs.createdAt, monthStart)
      )
    );

  return {
    contacts: contactCount,
    emailsSent,
    automationExecutions,
    aiGenerations,
    connectedStores: 0, // no commerce integrations built yet
  };
}
