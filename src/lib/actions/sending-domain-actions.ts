"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { workspaceMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { rateLimitByKey } from "@/lib/rate-limit";
import { addSendingDomain, removeSendingDomain, verifySendingDomain } from "@/lib/sending-domains/service";
import type { ActionState } from "@/lib/actions/auth-actions";

const PAGE = "/workspace/domains";

/** Only workspace owners/admins may change sending domains — a member shouldn't be able to alter how the business sends. */
async function requireDomainManager() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, user.id)))
    .limit(1);

  if (!member || member.role === "MEMBER") {
    return { denied: "Only the workspace owner or an admin can manage sending domains." } as const;
  }
  return { denied: null, userId: user.id, workspace } as const;
}

const idSchema = z.string().uuid();

export async function addSendingDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireDomainManager();
  if (ctx.denied) return { error: ctx.denied };

  const limit = await rateLimitByKey("sending-domains:add", ctx.workspace.id, 10, 3600);
  if (!limit.allowed) return { error: limit.message };

  const result = await addSendingDomain(ctx.workspace.id, String(formData.get("domain") ?? ""));
  if (!result.ok) return { error: result.error };

  await recordAuditLog({
    action: "sending_domain.added",
    userId: ctx.userId,
    workspaceId: ctx.workspace.id,
    metadata: { domain: result.value.domain },
  });
  revalidatePath(PAGE);
  return { success: `${result.value.domain} added. Now add the DNS records shown below at your domain host, then click Verify.` };
}

export async function verifySendingDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireDomainManager();
  if (ctx.denied) return { error: ctx.denied };

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Domain not found." };

  const limit = await rateLimitByKey("sending-domains:verify", ctx.workspace.id, 30, 3600);
  if (!limit.allowed) return { error: limit.message };

  const result = await verifySendingDomain(ctx.workspace.id, id.data);
  if (!result.ok) return { error: result.error };

  if (result.value.status === "VERIFIED") {
    await recordAuditLog({
      action: "sending_domain.verified",
      userId: ctx.userId,
      workspaceId: ctx.workspace.id,
      metadata: { domain: result.value.domain },
    });
  }
  revalidatePath(PAGE);
  return result.value.status === "VERIFIED"
    ? { success: `${result.value.domain} is verified. You can now send from addresses on this domain.` }
    : { error: result.value.statusNote ?? "We can't see the DNS records yet. DNS changes can take a while — try again shortly." };
}

export async function removeSendingDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireDomainManager();
  if (ctx.denied) return { error: ctx.denied };

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Domain not found." };

  const result = await removeSendingDomain(ctx.workspace.id, id.data);
  if (!result.ok) return { error: result.error };

  await recordAuditLog({
    action: "sending_domain.removed",
    userId: ctx.userId,
    workspaceId: ctx.workspace.id,
    metadata: { domain: result.value.domain },
  });
  revalidatePath(PAGE);
  return { success: `${result.value.domain} was removed.` };
}
