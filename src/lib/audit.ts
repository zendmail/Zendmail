import "server-only";
import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";

export async function recordAuditLog(input: {
  action: string;
  userId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await db.insert(auditLogs).values({
    action: input.action,
    userId: input.userId,
    workspaceId: input.workspaceId,
    metadata: input.metadata ?? {},
    ipAddress: input.ipAddress,
  });
}
