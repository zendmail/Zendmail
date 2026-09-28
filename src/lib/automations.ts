import "server-only";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { automations, automationSteps, automationRuns } from "@/db/schema";

export async function listAutomations(workspaceId: string) {
  const rows = await db
    .select()
    .from(automations)
    .where(and(eq(automations.workspaceId, workspaceId), sql`${automations.deletedAt} is null`))
    .orderBy(desc(automations.createdAt));

  const withCounts = await Promise.all(
    rows.map(async (a) => {
      const [{ count: stepCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(automationSteps)
        .where(eq(automationSteps.automationId, a.id));
      const [{ count: activeRuns }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(automationRuns)
        .where(and(eq(automationRuns.automationId, a.id), sql`${automationRuns.status} in ('ACTIVE','WAITING')`));
      const [{ count: completedRuns }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(automationRuns)
        .where(and(eq(automationRuns.automationId, a.id), eq(automationRuns.status, "COMPLETED")));
      return { ...a, stepCount, activeRuns, completedRuns };
    })
  );

  return withCounts;
}

export async function getAutomationWithSteps(workspaceId: string, automationId: string) {
  const [automation] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, automationId), eq(automations.workspaceId, workspaceId)))
    .limit(1);
  if (!automation) return null;

  const steps = await db
    .select()
    .from(automationSteps)
    .where(eq(automationSteps.automationId, automationId))
    .orderBy(automationSteps.order);

  return { ...automation, steps };
}
