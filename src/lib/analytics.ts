import "server-only";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, campaignRecipients } from "@/db/schema";

export async function getWorkspaceEmailOverview(workspaceId: string) {
  const [row] = await db
    .select({
      sent: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'SENT')::int`,
      opened: sql<number>`count(*) filter (where ${campaignRecipients.openedAt} is not null)::int`,
      clicked: sql<number>`count(*) filter (where ${campaignRecipients.clickedAt} is not null)::int`,
      failed: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'FAILED')::int`,
    })
    .from(campaignRecipients)
    .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
    .where(eq(campaigns.workspaceId, workspaceId));

  const [{ count: campaignsSent }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaigns)
    .where(and(eq(campaigns.workspaceId, workspaceId), eq(campaigns.status, "SENT")));

  const sent = row?.sent ?? 0;
  const opened = row?.opened ?? 0;
  const clicked = row?.clicked ?? 0;
  const failed = row?.failed ?? 0;

  return {
    campaignsSent,
    sent,
    openRate: sent > 0 ? (opened / sent) * 100 : 0,
    clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
    bounceRate: sent > 0 ? (failed / sent) * 100 : 0,
    opened,
    clicked,
  };
}

export async function listCampaignPerformance(workspaceId: string) {
  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      sentAt: campaigns.sentAt,
      recipientCount: campaigns.recipientCount,
      opened: sql<number>`count(*) filter (where ${campaignRecipients.openedAt} is not null)::int`,
      clicked: sql<number>`count(*) filter (where ${campaignRecipients.clickedAt} is not null)::int`,
      delivered: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'SENT')::int`,
    })
    .from(campaigns)
    .leftJoin(campaignRecipients, eq(campaignRecipients.campaignId, campaigns.id))
    .where(and(eq(campaigns.workspaceId, workspaceId), eq(campaigns.status, "SENT")))
    .groupBy(campaigns.id)
    .orderBy(desc(campaigns.sentAt));

  return rows.map((r) => ({
    ...r,
    openRate: r.delivered > 0 ? (r.opened / r.delivered) * 100 : 0,
    clickRate: r.delivered > 0 ? (r.clicked / r.delivered) * 100 : 0,
  }));
}
