"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { workspaceMembers, sendingDomains } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { rateLimitByKey } from "@/lib/rate-limit";
import { sendCampaignEmail, SenderNotAuthorizedError } from "@/lib/email";
import { ProviderNotConfiguredError } from "@/lib/email-provider";
import {
  addSendingDomain,
  verifySendingDomain,
  removeSendingDomain,
  createSendingIdentity,
  deleteSendingIdentity,
  listSenderCandidates,
  SendingError,
} from "@/lib/sending/domains";
import { isDomainSendable } from "@/lib/sending/rules";
import type { ActionState } from "@/lib/actions/auth-actions";

/**
 * Domain and identity management is restricted to workspace OWNER/ADMIN, enforced here on the
 * server — hiding a button in the UI is never the control.
 */
async function requireDomainAdmin() {
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
    return { denied: true as const, user, workspace };
  }
  return { denied: false as const, user, workspace };
}

const DENIED: ActionState = { error: "Only workspace owners and admins can manage sending domains." };

function toMessage(err: unknown, fallback: string) {
  if (err instanceof SendingError) return err.message;
  if (err instanceof ProviderNotConfiguredError) return err.message;
  console.error("Sending action failed:", err instanceof Error ? err.message : err);
  return err instanceof Error && err.message.startsWith("Email provider") ? err.message : fallback;
}

export async function addSendingDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireDomainAdmin();
  if (ctx.denied) return DENIED;
  const limit = await rateLimitByKey("sending-domain-add", ctx.workspace.id, 10, 3600);
  if (!limit.allowed) return { error: limit.message };

  let domainId: string;
  try {
    const row = await addSendingDomain(ctx.workspace.id, String(formData.get("domain") ?? ""));
    domainId = row.id;
    await recordAuditLog({ action: "sending_domain.added", userId: ctx.user.id, workspaceId: ctx.workspace.id, metadata: { domain: row.domain } });
  } catch (err) {
    return { error: toMessage(err, "Couldn't add the domain. Try again.") };
  }
  revalidatePath("/workspace/sending-domains");
  redirect(`/workspace/sending-domains/${domainId}`);
}

export async function verifySendingDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireDomainAdmin();
  if (ctx.denied) return DENIED;
  const limit = await rateLimitByKey("sending-domain-verify", ctx.workspace.id, 30, 3600);
  if (!limit.allowed) return { error: limit.message };

  try {
    const row = await verifySendingDomain(ctx.workspace.id, String(formData.get("domainId") ?? ""));
    await recordAuditLog({
      action: "sending_domain.verify_requested",
      userId: ctx.user.id,
      workspaceId: ctx.workspace.id,
      metadata: { domainId: row?.id, dkim: row?.dkimStatus, spf: row?.spfStatus },
    });
    revalidatePath("/workspace/sending-domains", "layout");
    if (row?.lastError) return { error: row.lastError };
    if (row && isDomainSendable(row)) return { success: "Domain verified — it's ready to send." };
    return { success: "DNS checked. Some records aren't passing yet — DNS changes can take a while to propagate." };
  } catch (err) {
    return { error: toMessage(err, "Couldn't check DNS. Try again.") };
  }
}

export async function removeSendingDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireDomainAdmin();
  if (ctx.denied) return DENIED;
  try {
    await removeSendingDomain(ctx.workspace.id, String(formData.get("domainId") ?? ""));
    await recordAuditLog({ action: "sending_domain.removed", userId: ctx.user.id, workspaceId: ctx.workspace.id, metadata: { domainId: String(formData.get("domainId")) } });
  } catch (err) {
    return { error: toMessage(err, "Couldn't remove the domain.") };
  }
  revalidatePath("/workspace/sending-domains");
  redirect("/workspace/sending-domains");
}

const identitySchema = z.object({
  domainId: z.string().uuid(),
  fromName: z.string().trim().min(1, "Enter a sender name").max(80),
  localPart: z.string().trim().min(1, "Enter the address (before the @)").max(64),
  replyTo: z.string().trim().max(254).optional(),
});

export async function createSendingIdentityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireDomainAdmin();
  if (ctx.denied) return DENIED;
  const parsed = identitySchema.safeParse({
    domainId: formData.get("domainId"),
    fromName: formData.get("fromName"),
    localPart: formData.get("localPart"),
    replyTo: formData.get("replyTo") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  try {
    const identity = await createSendingIdentity(ctx.workspace.id, parsed.data);
    await recordAuditLog({ action: "sending_identity.created", userId: ctx.user.id, workspaceId: ctx.workspace.id, metadata: { fromEmail: identity.fromEmail } });
  } catch (err) {
    return { error: toMessage(err, "Couldn't create the identity.") };
  }
  revalidatePath("/workspace/sending-domains", "layout");
  return { success: "Sending identity created." };
}

export async function deleteSendingIdentityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireDomainAdmin();
  if (ctx.denied) return DENIED;
  await deleteSendingIdentity(ctx.workspace.id, String(formData.get("identityId") ?? ""));
  await recordAuditLog({ action: "sending_identity.deleted", userId: ctx.user.id, workspaceId: ctx.workspace.id, metadata: { identityId: String(formData.get("identityId")) } });
  revalidatePath("/workspace/sending-domains", "layout");
  return { success: "Identity removed." };
}

/** Sends a test message to the signed-in user's OWN address only — never an arbitrary recipient. */
export async function sendDomainTestEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireDomainAdmin();
  if (ctx.denied) return DENIED;
  const limit = await rateLimitByKey("sending-domain-test", ctx.workspace.id, 10, 3600);
  if (!limit.allowed) return { error: limit.message };

  const identityId = String(formData.get("identityId") ?? "");
  const identity = (await listSenderCandidates(ctx.workspace.id)).find((i) => i.id === identityId);
  if (!identity) return { error: "Choose one of this workspace's sending identities." };

  try {
    await sendCampaignEmail({
      workspaceId: ctx.workspace.id,
      source: "DOMAIN_TEST",
      to: ctx.user.email,
      fromName: identity.fromName,
      fromEmail: identity.fromEmail,
      subject: `Zendmail test from ${identity.domain.domain}`,
      html: `<p>This is a test message sent from <strong>${identity.fromEmail}</strong> through Zendmail.</p><p>If you can read this, the provider accepted it. Check the message headers (spf/dkim/dmarc) to confirm your domain authenticated.</p>`,
      text: `This is a test message sent from ${identity.fromEmail} through Zendmail. If you can read this, the provider accepted it. Check the message headers (spf/dkim/dmarc) to confirm your domain authenticated.`,
    });
    await db
      .update(sendingDomains)
      .set({ testEmailSentAt: new Date() })
      .where(and(eq(sendingDomains.id, identity.domainId), eq(sendingDomains.workspaceId, ctx.workspace.id)));
  } catch (err) {
    if (err instanceof SenderNotAuthorizedError) return { error: `${err.message} ${err.resolution}` };
    return { error: toMessage(err, "The test email couldn't be sent.") };
  }
  revalidatePath("/workspace/sending-domains", "layout");
  return { success: `Test email handed to the provider for ${ctx.user.email}. Delivery to your inbox isn't guaranteed by this step.` };
}
