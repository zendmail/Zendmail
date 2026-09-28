import "server-only";
import { and, eq, sql, desc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
  workspaces,
  subscriptions,
  plans,
  campaignRecipients,
  auditLogs,
  workspaceMembers,
  contacts,
} from "@/db/schema";

export async function getPlatformOverview() {
  const [{ count: totalUsers }] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(isNull(users.deletedAt));
  const [{ count: totalWorkspaces }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaces)
    .where(isNull(workspaces.deletedAt));
  const [{ count: totalContacts }] = await db.select({ count: sql<number>`count(*)::int` }).from(contacts).where(isNull(contacts.deletedAt));
  const [{ count: totalEmailsSent }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.status, "SENT"));
  const [{ count: suspendedUsers }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`${users.suspendedAt} is not null`);

  const planBreakdown = await db
    .select({ planName: plans.name, count: sql<number>`count(*)::int` })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .groupBy(plans.name);

  return { totalUsers, totalWorkspaces, totalContacts, totalEmailsSent, suspendedUsers, planBreakdown };
}

export async function listAllUsers(search?: string) {
  const conditions = [isNull(users.deletedAt)];
  if (search) {
    conditions.push(sql`(${users.email} ilike ${`%${search}%`} or ${users.name} ilike ${`%${search}%`})`);
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      suspendedAt: users.suspendedAt,
      createdAt: users.createdAt,
      workspaceCount: sql<number>`(select count(*)::int from ${workspaceMembers} wm where wm.user_id = ${users.id})`,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(100);

  return rows;
}

export async function listAllWorkspaces() {
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      createdAt: workspaces.createdAt,
      onboardingStep: workspaces.onboardingStep,
      planName: plans.name,
      subStatus: subscriptions.status,
      contactCount: sql<number>`(select count(*)::int from ${contacts} c where c.workspace_id = ${workspaces.id} and c.deleted_at is null)`,
    })
    .from(workspaces)
    .leftJoin(subscriptions, eq(subscriptions.workspaceId, workspaces.id))
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(isNull(workspaces.deletedAt))
    .orderBy(desc(workspaces.createdAt))
    .limit(100);

  return rows;
}

export async function listRecentAuditLogs(limit = 100) {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      userId: auditLogs.userId,
      workspaceId: auditLogs.workspaceId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

const SECURITY_ACTIONS = [
  "auth.password_reset_completed",
  "auth.password_reset_requested",
  "contact.unsubscribed",
  "admin.user_suspended",
  "admin.user_reinstated",
];

export async function listSecurityEvents(limit = 100) {
  return db
    .select()
    .from(auditLogs)
    .where(sql`${auditLogs.action} = any(${SECURITY_ACTIONS})`)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
