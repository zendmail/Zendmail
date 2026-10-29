"use server";

import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { autopilotProposals, automationSteps, automations, campaigns, emailTemplates, segmentRules, segments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { aiComplete } from "@/lib/ai/provider";
import { canUseTemplate } from "@/lib/template-access";
import { getDefaultSender } from "@/lib/sending/domains";
import { TEMPLATE_LIBRARY } from "@/lib/template-library";
import { sanitizeBlocks } from "@/lib/email-builder/document";
import { parseTheme } from "@/lib/email-builder/theme";
import { loadStoreProfile } from "@/lib/autopilot/profile-loader";
import { buildPlan, type AudienceSpec } from "@/lib/autopilot/playbook";
import { generateCopy } from "@/lib/autopilot/copy";
import { personalizeTemplate } from "@/lib/autopilot/personalize";

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspace };
}

const DAY = 86_400_000;

/** Reads the store, decides what to send to whom, and prepares reviewable drafts. Sends nothing. */
export async function generateAutopilotPlanAction() {
  const { userId, workspace } = await requireWorkspace();
  const limit = await rateLimit("autopilot-generate", 6, 60 * 60);
  if (!limit.allowed) redirect("/ai/autopilot?error=rate");

  const profile = await loadStoreProfile(workspace.id);
  const plan = buildPlan(profile);

  // Don't re-propose what the user recently approved (14 days) or dismissed (30 days).
  const recent = await db
    .select({ key: autopilotProposals.key, status: autopilotProposals.status, decidedAt: autopilotProposals.decidedAt })
    .from(autopilotProposals)
    .where(and(eq(autopilotProposals.workspaceId, workspace.id), inArray(autopilotProposals.status, ["APPROVED", "DISMISSED"]), gte(autopilotProposals.decidedAt, new Date(Date.now() - 30 * DAY))));
  const skip = new Set(recent.filter((r) => r.status === "DISMISSED" || (r.decidedAt && r.decidedAt.getTime() > Date.now() - 14 * DAY)).map((r) => r.key));

  const useAi = !!process.env.AI_PROVIDER_API_KEY;
  const items = plan.items.filter((i) => !skip.has(i.key));

  const built = await Promise.all(
    items.map(async (item) => {
      const def = item.templateKeys
        .map((k) => TEMPLATE_LIBRARY.find((t) => t.key === k))
        .find((t) => t && canUseTemplate(workspace.planName, t.tier));
      if (!def) return null;
      const { copy, source } = await generateCopy(item, profile, useAi ? aiComplete : null);
      const out = personalizeTemplate(def, { brand: { name: workspace.name, logoUrl: workspace.logoUrl, website: workspace.website, currency: workspace.currency }, products: profile.featured, copy, usesProducts: item.usesProducts });
      return { item, def, source, out };
    })
  );

  await db.delete(autopilotProposals).where(and(eq(autopilotProposals.workspaceId, workspace.id), eq(autopilotProposals.status, "PROPOSED")));
  const rows = built.filter((b): b is NonNullable<typeof b> => b !== null).map(({ item, def, source, out }) => ({
    workspaceId: workspace.id,
    key: item.key,
    kind: item.kind,
    title: item.title,
    goal: item.goal,
    why: item.why,
    timing: item.timing,
    audience: item.audience as unknown as Record<string, unknown>,
    templateKey: def.key,
    copySource: source,
    subject: out.subject,
    previewText: out.previewText,
    blocks: out.blocks,
    theme: out.theme,
    warnings: out.warnings,
  }));
  if (rows.length) await db.insert(autopilotProposals).values(rows);

  await recordAuditLog({ action: "autopilot.plan_generated", userId, workspaceId: workspace.id, metadata: { kind: profile.kind, proposals: rows.length, ai: useAi } });
  revalidatePath("/ai/autopilot");
  redirect("/ai/autopilot");
}

async function loadProposal(workspaceId: string, id: string) {
  if (!z.string().uuid().safeParse(id).success) redirect("/ai/autopilot");
  const [p] = await db
    .select()
    .from(autopilotProposals)
    .where(and(eq(autopilotProposals.id, id), eq(autopilotProposals.workspaceId, workspaceId), eq(autopilotProposals.status, "PROPOSED")))
    .limit(1);
  if (!p) redirect("/ai/autopilot");
  return p;
}

async function ensureSegment(workspaceId: string, audience: AudienceSpec): Promise<string | null> {
  if (audience.type !== "SEGMENT") return null;
  const [existing] = await db
    .select({ id: segments.id })
    .from(segments)
    .where(and(eq(segments.workspaceId, workspaceId), eq(segments.name, audience.segmentName), isNull(segments.deletedAt)))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(segments)
    .values({ workspaceId, name: audience.segmentName, description: audience.label, matchType: audience.matchType })
    .returning({ id: segments.id });
  await db.insert(segmentRules).values(audience.rules.map((r) => ({ segmentId: created.id, field: r.field, operator: r.operator, value: r.value })));
  return created.id;
}

/** Approve = create the real draft. It is never sent from here: it still goes through review and the pre-send checks. */
export async function approveAutopilotProposalAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const proposal = await loadProposal(workspace.id, String(formData.get("proposalId")));
  const blocks = sanitizeBlocks(proposal.blocks);
  const theme = parseTheme(proposal.theme);
  const audience = proposal.audience as unknown as AudienceSpec;

  if (proposal.kind === "WELCOME_FLOW") {
    const [template] = await db
      .insert(emailTemplates)
      .values({ workspaceId: workspace.id, name: "Welcome email (Autopilot)", category: "WELCOME", subject: proposal.subject, previewText: proposal.previewText, blocks, theme })
      .returning({ id: emailTemplates.id });
    const [automation] = await db
      .insert(automations)
      .values({ workspaceId: workspace.id, name: "Welcome new subscribers", status: "DRAFT", triggerType: "CONTACT_CREATED", triggerConfig: {} })
      .returning({ id: automations.id });
    await db.insert(automationSteps).values({ automationId: automation.id, order: 0, type: "SEND_EMAIL", config: { templateId: template.id } });
    await db.update(autopilotProposals).set({ status: "APPROVED", decidedAt: new Date() }).where(eq(autopilotProposals.id, proposal.id));
    await recordAuditLog({ action: "autopilot.approved", userId, workspaceId: workspace.id, metadata: { key: proposal.key, automationId: automation.id } });
    revalidatePath("/ai/autopilot");
    redirect(`/automations/${automation.id}`);
  }

  const segmentId = await ensureSegment(workspace.id, audience);
  const sender = await getDefaultSender(workspace.id);
  const [campaign] = await db
    .insert(campaigns)
    .values({
      workspaceId: workspace.id,
      name: proposal.title.slice(0, 120),
      audienceType: segmentId ? "SEGMENT" : "ALL",
      segmentId,
      fromName: sender?.fromName ?? workspace.name,
      fromEmail: sender?.fromEmail ?? `hello@${workspace.slug}.zendmail.demo`,
      replyTo: sender?.replyTo ?? null,
      subject: proposal.subject,
      previewText: proposal.previewText,
      blocks,
      theme,
    })
    .returning({ id: campaigns.id });
  await db.update(autopilotProposals).set({ status: "APPROVED", decidedAt: new Date() }).where(eq(autopilotProposals.id, proposal.id));
  await recordAuditLog({ action: "autopilot.approved", userId, workspaceId: workspace.id, metadata: { key: proposal.key, campaignId: campaign.id } });
  revalidatePath("/ai/autopilot");
  redirect(`/campaigns/${campaign.id}/editor`);
}

export async function dismissAutopilotProposalAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const proposal = await loadProposal(workspace.id, String(formData.get("proposalId")));
  await db.update(autopilotProposals).set({ status: "DISMISSED", decidedAt: new Date() }).where(eq(autopilotProposals.id, proposal.id));
  await recordAuditLog({ action: "autopilot.dismissed", userId, workspaceId: workspace.id, metadata: { key: proposal.key } });
  revalidatePath("/ai/autopilot");
}
