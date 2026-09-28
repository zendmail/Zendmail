import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { userActiveWorkspace, workspaces, subscriptions, plans } from "@/db/schema";

export async function getActiveWorkspaceForUser(userId: string) {
  const [row] = await db
    .select({
      workspace: workspaces,
      planName: plans.name,
    })
    .from(userActiveWorkspace)
    .innerJoin(workspaces, eq(userActiveWorkspace.workspaceId, workspaces.id))
    .leftJoin(subscriptions, eq(subscriptions.workspaceId, workspaces.id))
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(userActiveWorkspace.userId, userId))
    .limit(1);

  if (!row) return null;

  return { ...row.workspace, planName: row.planName ?? "Free" };
}
