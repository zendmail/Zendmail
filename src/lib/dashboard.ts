import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { automationEvents, automationRuns, automations, digitalPurchases, storeOrders } from "@/db/schema";
import { contacts } from "@/db/schema";
import { getWorkspaceContactCounts } from "./contacts";
import { getWorkspaceEmailOverview, listCampaignPerformance } from "./analytics";
import { listCampaigns } from "./campaigns";
import { listAutomations } from "./automations";
import { listSegmentsWithCounts } from "./segments";
import { listAbandonedCheckouts, getSubscriptionsNeedingAttention } from "./digital-commerce";

export type DashboardInsight = {
  id: string;
  title: string;
  description: string;
  action: string;
  href: string;
};

/**
 * Every number here comes from a real query against this workspace's
 * own data. There is no fallback to demo/sample values — a brand-new
 * workspace with nothing in it gets zeros and honest empty states, not
 * numbers manufactured to make the product look busier than it is.
 */
export async function getDashboardData(workspaceId: string, workspaceCurrency: string) {
  const [
    contactCounts,
    emailOverview,
    allCampaigns,
    automationList,
    segmentList,
    campaignPerformanceRows,
    purchaseRevenueRow,
    storeRevenueRows,
    recentAutomationActivity,
    pausedRow,
    abandonedCheckoutData,
    subscriptionsNeedingAttention,
  ] = await Promise.all([
    getWorkspaceContactCounts(workspaceId),
    getWorkspaceEmailOverview(workspaceId),
    listCampaigns(workspaceId),
    listAutomations(workspaceId),
    listSegmentsWithCounts(workspaceId),
    listCampaignPerformance(workspaceId),
    db
      .select({
        amount: sql<number>`coalesce(sum(${digitalPurchases.amount}), 0)::float8`,
        purchaseCount: sql<number>`count(*)::int`,
      })
      .from(digitalPurchases)
      .where(and(eq(digitalPurchases.workspaceId, workspaceId), eq(digitalPurchases.status, "COMPLETED"))),
    db
      .select({
        currency: storeOrders.currency,
        amount: sql<number>`coalesce(sum(${storeOrders.total}), 0)::float8`,
        orderCount: sql<number>`count(*)::int`,
      })
      .from(storeOrders)
      .where(and(
        eq(storeOrders.workspaceId, workspaceId),
        eq(storeOrders.currency, workspaceCurrency),
        sql`lower(${storeOrders.financialStatus}) in ('paid', 'processing', 'completed')`
      ))
      .groupBy(storeOrders.currency),
    db
      .select({
        id: automationEvents.id,
        workflowId: automations.id,
        workflowName: automations.name,
        workflowStatus: automations.status,
        type: automationEvents.type,
        createdAt: automationEvents.createdAt,
      })
      .from(automationEvents)
      .innerJoin(automationRuns, eq(automationEvents.runId, automationRuns.id))
      .innerJoin(automations, eq(automationRuns.automationId, automations.id))
      .where(and(eq(automations.workspaceId, workspaceId), sql`${automations.deletedAt} is null`))
      .orderBy(desc(automationEvents.createdAt))
      .limit(3),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), sql`${contacts.pausedUntil} > now()`)),
    listAbandonedCheckouts(workspaceId),
    getSubscriptionsNeedingAttention(workspaceId),
  ]);

  const sentCampaigns = allCampaigns.filter((c) => c.status === "SENT");
  const activeAutomations = automationList.filter((a) => a.status === "ACTIVE");
  const pausedCount = pausedRow[0]?.count ?? 0;
  const performanceByCampaign = new Map(campaignPerformanceRows.map((row) => [row.id, row]));
  const storeRevenue = storeRevenueRows[0];
  const revenue = (purchaseRevenueRow[0]?.purchaseCount ?? 0) + (storeRevenue?.orderCount ?? 0) > 0
    ? (purchaseRevenueRow[0]?.amount ?? 0) + (storeRevenue?.amount ?? 0)
    : null;

  const insights = buildInsights({
    contactTotal: contactCounts.total,
    campaignCount: allCampaigns.length,
    activeAutomationCount: activeAutomations.length,
    segmentCount: segmentList.length,
    pausedCount,
    topAutomation: automationList.find((a) => a.completedRuns > 0),
    abandonedCheckoutCount: abandonedCheckoutData.checkouts.length,
    potentialRecoveryValue: abandonedCheckoutData.potentialRecoveryValue,
    subscriptionsNeedingAttentionCount: subscriptionsNeedingAttention.length,
  });

  return {
    contactCounts,
    emailOverview,
    recentCampaigns: allCampaigns.slice(0, 5).map((campaign) => {
      const performance = performanceByCampaign.get(campaign.id);
      return {
        ...campaign,
        delivered: performance?.delivered ?? 0,
        openRate: performance?.openRate ?? null,
        clickRate: performance?.clickRate ?? null,
      };
    }),
    campaignPerformance: campaignPerformanceRows.slice(0, 6).reverse().map((row) => ({
      id: row.id,
      name: row.name,
      chartLabel: row.name.length > 14 ? `${row.name.slice(0, 12)}...` : row.name,
      sent: row.delivered,
      openRate: row.openRate,
      clickRate: row.clickRate,
    })),
    revenue,
    automationSummary: automationList.slice(0, 3),
    activeAutomationCount: activeAutomations.length,
    recentAutomationActivity,
    sentCampaignCount: sentCampaigns.length,
    insights,
  };
}

function buildInsights(data: {
  contactTotal: number;
  campaignCount: number;
  activeAutomationCount: number;
  segmentCount: number;
  pausedCount: number;
  topAutomation?: { id: string; name: string; completedRuns: number };
  abandonedCheckoutCount: number;
  potentialRecoveryValue: number | null;
  subscriptionsNeedingAttentionCount: number;
}): DashboardInsight[] {
  if (data.contactTotal === 0) {
    return []; // nothing meaningful to say yet — the empty state on the card covers this
  }

  const insights: DashboardInsight[] = [];

  // Digital commerce opportunities take priority when real data exists —
  // these only ever appear once a real abandoned-checkout or
  // subscription row exists. Nothing shows for a workspace with no
  // connected store.
  if (data.abandonedCheckoutCount > 0) {
    const valueText =
      data.potentialRecoveryValue !== null
        ? ` worth an estimated ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(data.potentialRecoveryValue)}`
        : "";
    insights.push({
      id: "abandoned-checkouts",
      title: `${data.abandonedCheckoutCount} abandoned checkout${data.abandonedCheckoutCount === 1 ? "" : "s"}${valueText}`,
      description: "Recover this revenue with a targeted follow-up campaign.",
      action: "Recover checkouts",
      href: "/commerce/abandoned-carts",
    });
  }

  if (data.subscriptionsNeedingAttentionCount > 0) {
    insights.push({
      id: "subscriptions-attention",
      title: `${data.subscriptionsNeedingAttentionCount} subscription${data.subscriptionsNeedingAttentionCount === 1 ? "" : "s"} need attention in the next 7 days`,
      description: "Renewals due soon or payments past due.",
      action: "Review subscriptions",
      href: "/commerce/customers",
    });
  }

  if (data.campaignCount === 0) {
    insights.push({
      id: "no-campaigns",
      title: `You have ${data.contactTotal.toLocaleString()} contacts but haven't sent a campaign yet`,
      description: "Create your first campaign to start reaching them.",
      action: "Create campaign",
      href: "/campaigns",
    });
  }

  if (data.segmentCount === 0) {
    insights.push({
      id: "no-segments",
      title: "You haven't created any segments yet",
      description: "Segments let you target specific groups of contacts instead of emailing everyone at once.",
      action: "Create segment",
      href: "/segments/new",
    });
  }

  if (data.activeAutomationCount === 0) {
    insights.push({
      id: "no-automations",
      title: "No automations are running",
      description: "Set up a welcome flow or tag-based automation to engage contacts without manual work.",
      action: "Create automation",
      href: "/automations/new",
    });
  }

  if (data.pausedCount > 0) {
    insights.push({
      id: "paused-contacts",
      title: `${data.pausedCount} contact${data.pausedCount === 1 ? " has" : "s have"} paused emails via Smart Unsubscribe`,
      description: "They'll automatically resume receiving campaigns once their pause period ends.",
      action: "View settings",
      href: "/workspace/settings",
    });
  }

  if (data.topAutomation) {
    insights.push({
      id: "automation-performance",
      title: `"${data.topAutomation.name}" has completed ${data.topAutomation.completedRuns} run${data.topAutomation.completedRuns === 1 ? "" : "s"}`,
      description: "Review its performance or add more steps to the workflow.",
      action: "View automation",
      href: `/automations/${data.topAutomation.id}`,
    });
  }

  return insights.slice(0, 3);
}
