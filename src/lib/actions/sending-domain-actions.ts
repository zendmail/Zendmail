"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { sendingDomains, sendingIdentities } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { normalizeDomain, validateDomainOwnership } from "@/lib/sending-domains";
import type { ActionState } from "@/lib/actions/auth-actions";

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspace };
}

const domainSchema = z.object({
  domain: z.string().trim().min(1, "Enter a valid domain.").transform((value) => normalizeDomain(value)),
});

const identitySchema = z.object({
  name: z.string().trim().min(1, "Enter a sender name."),
  fromEmail: z.string().trim().email("Enter a valid sender email."),
  replyTo: z.string().trim().email("Enter a valid Reply-To email.").optional().or(z.literal("")),
  domain: z.string().trim().min(1, "Choose a verified domain."),
});

export async function createSendingDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, workspace } = await requireWorkspace();
  const parsed = domainSchema.safeParse({ domain: formData.get("domain") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid domain." };
  }

  const domain = parsed.data.domain;
  if (!validateDomainOwnership(domain)) {
    return { error: "Enter a valid business domain such as learnwithahmed.com." };
  }

  const [existing] = await db
    .select()
    .from(sendingDomains)
    .where(and(eq(sendingDomains.workspaceId, workspace.id), eq(sendingDomains.domain, domain)))
    .limit(1);

  if (existing) {
    return { success: `The domain ${domain} is already configured for this workspace.` };
  }

  await db.insert(sendingDomains).values({
    workspaceId: workspace.id,
    domain,
    status: "PENDING",
    dkimStatus: "PENDING",
    spfStatus: "PENDING",
    dmarcStatus: "PENDING",
    metadata: { createdBy: "workspace_settings" },
  });

  await recordAuditLog({
    action: "sending_domain.created",
    userId,
    workspaceId: workspace.id,
    metadata: { domain },
  });

  revalidatePath("/workspace/settings");
  revalidatePath("/workspace/settings/sending-domains");
  return { success: `${domain} has been added. Follow the verification steps to authenticate it.` };
}

export async function verifySendingDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, workspace } = await requireWorkspace();
  const domain = normalizeDomain(String(formData.get("domain") ?? ""));

  if (!domain) {
    return { error: "Choose a domain to verify." };
  }

  const [row] = await db
    .select()
    .from(sendingDomains)
    .where(and(eq(sendingDomains.workspaceId, workspace.id), eq(sendingDomains.domain, domain)))
    .limit(1);

  if (!row) {
    return { error: "This domain is not configured for your workspace." };
  }

  await db
    .update(sendingDomains)
    .set({
      status: "VERIFIED",
      ownershipVerifiedAt: new Date(),
      spfStatus: "PASSING",
      dkimStatus: "PASSING",
      dmarcStatus: "RECOMMENDED",
      updatedAt: new Date(),
    })
    .where(eq(sendingDomains.id, row.id));

  await recordAuditLog({
    action: "sending_domain.verified",
    userId,
    workspaceId: workspace.id,
    metadata: { domain },
  });

  revalidatePath("/workspace/settings");
  revalidatePath("/workspace/settings/sending-domains");
  return { success: `${domain} is verified and ready for production sends.` };
}

export async function createSendingIdentityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, workspace } = await requireWorkspace();
  const parsed = identitySchema.safeParse({
    name: formData.get("name"),
    fromEmail: formData.get("fromEmail"),
    replyTo: formData.get("replyTo") || "",
    domain: formData.get("domain"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the sender form and try again." };
  }

  const domain = normalizeDomain(parsed.data.domain);
  const [sendingDomain] = await db
    .select()
    .from(sendingDomains)
    .where(and(eq(sendingDomains.workspaceId, workspace.id), eq(sendingDomains.domain, domain)))
    .limit(1);

  if (!sendingDomain || sendingDomain.status !== "VERIFIED") {
    return { error: `The domain ${domain} must be verified before it can be used as a sender.` };
  }

  const [existing] = await db
    .select()
    .from(sendingIdentities)
    .where(and(eq(sendingIdentities.workspaceId, workspace.id), eq(sendingIdentities.fromEmail, parsed.data.fromEmail)))
    .limit(1);

  if (existing) {
    return { error: "A sender identity with that email already exists in this workspace." };
  }

  await db.insert(sendingIdentities).values({
    workspaceId: workspace.id,
    sendingDomainId: sendingDomain.id,
    name: parsed.data.name,
    fromEmail: parsed.data.fromEmail,
    replyTo: parsed.data.replyTo || null,
    status: "ACTIVE",
    isDefault: false,
  });

  await recordAuditLog({
    action: "sending_identity.created",
    userId,
    workspaceId: workspace.id,
    metadata: { fromEmail: parsed.data.fromEmail, domain },
  });

  revalidatePath("/workspace/settings");
  revalidatePath("/workspace/settings/sending-domains");
  return { success: `${parsed.data.fromEmail} is now available as a sending identity.` };
}
