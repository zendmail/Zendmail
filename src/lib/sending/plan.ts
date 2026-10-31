import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { sentMessages } from "@/db/schema";
import { getWorkspaceSubscription } from "@/lib/billing/usage";
import { dailyAllowance } from "./plan-rules";

/** The plan name that gates sending features. A workspace without a subscription row is on Free. */
export async function getWorkspacePlanName(workspaceId: string): Promise<string> {
  const row = await getWorkspaceSubscription(workspaceId);
  return row?.plan.name ?? "Free";
}

/** Messages sent through the shared Zendmail sender in the last 24 hours (the Free-plan allowance is measured on these). */
export async function countSharedSendsLast24h(workspaceId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sentMessages)
    .where(and(eq(sentMessages.workspaceId, workspaceId), eq(sentMessages.senderMode, "ZENDMAIL_MANAGED"), gte(sentMessages.createdAt, since)));
  return row?.n ?? 0;
}

export async function getSendAllowance(workspaceId: string) {
  const planName = await getWorkspacePlanName(workspaceId);
  const sent = await countSharedSendsLast24h(workspaceId);
  return { planName, ...dailyAllowance(planName, sent) };
}
