"use server";

import { and, eq, isNull, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { campaigns, emailTemplates, type EmailBlock } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { audienceSchema, contentSchema, testEmailSchema, scheduleSchema } from "@/lib/validation/campaigns";
import { dispatchCampaign } from "@/lib/campaigns";
import { emailFooterAddress } from "@/lib/legal";
import { renderBlocksToHtml, renderBlocksToText, createDefaultBlock } from "@/lib/email-blocks";
import { applyMergeTags, buildVars } from "@/lib/email-builder/merge";
import { canUseTemplate } from "@/lib/template-access";
import { applyItemOp, isSectionType, setSectionField, type ItemOp } from "@/lib/email-builder/schema";
import { parseTheme } from "@/lib/email-builder/theme";
import { getDefaultSender } from "@/lib/sending/domains";
import { sendCampaignEmail, SenderNotAuthorizedError } from "@/lib/email";
import type { ActionState } from "@/lib/actions/auth-actions";

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspace };
}

const BLOCK_TYPES: EmailBlock["type"][] = [
  "heading", "text", "image", "button", "divider", "spacer", "footer", "header", "hero", "coupon", "cards", "list",
  "testimonials", "split", "callout", "wave", "social", "links",
];

async function requireDraftCampaign(workspaceId: string, campaignId: string) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.workspaceId, workspaceId)))
    .limit(1);
  if (!campaign) redirect("/campaigns");
  // Sent / sending / scheduled campaigns are a record of what went out: no edits, same rule as image uploads.
  if (campaign.status !== "DRAFT") redirect(`/campaigns/${campaign.id}`);
  return campaign;
}

/** Creates a blank draft campaign and sends the user straight into the audience step. */
export async function createDraftCampaignAction() {
  const { userId, workspace } = await requireWorkspace();

  const [campaign] = await db
    .insert(campaigns)
    .values({
      workspaceId: workspace.id,
      name: "Untitled campaign",
      fromName: workspace.name,
      fromEmail: `hello@${workspace.slug}.zendmail.demo`,
      subject: "",
    })
    .returning();

  await recordAuditLog({ action: "campaign.created", userId, workspaceId: workspace.id, metadata: { campaignId: campaign.id } });
  redirect(`/campaigns/${campaign.id}/audience`);
}

export async function updateAudienceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  await requireDraftCampaign(workspace.id, campaignId);

  const parsed = audienceSchema.safeParse({
    audienceType: formData.get("audienceType"),
    segmentId: formData.get("segmentId") || undefined,
  });
  if (!parsed.success) {
    return { error: "Choose an audience to continue." };
  }

  await db
    .update(campaigns)
    .set({
      audienceType: parsed.data.audienceType,
      segmentId: parsed.data.audienceType === "SEGMENT" ? parsed.data.segmentId || null : null,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  redirect(`/campaigns/${campaignId}/content`);
}

async function loadUsableTemplate(workspace: { id: string; planName: string }, templateId: string) {
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(
      eq(emailTemplates.id, templateId),
      or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id))
    ))
    .limit(1);
  if (!template) return { template: null, locked: false } as const;
  // Pro templates can be previewed by anyone but only used on a paid plan — enforced here, not just in the UI.
  return { template, locked: !canUseTemplate(workspace.planName, template.tier) } as const;
}

export async function applyTemplateAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  const templateId = String(formData.get("templateId"));
  await requireDraftCampaign(workspace.id, campaignId);

  const { template, locked } = await loadUsableTemplate(workspace, templateId);
  if (!template) return;
  if (locked) redirect("/workspace/billing?upgrade=templates");

  await db
    .update(campaigns)
    .set({
      blocks: template.blocks,
      theme: template.theme,
      subject: template.subject ?? "",
      previewText: template.previewText ?? "",
      templateId: template.id,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  revalidatePath(`/campaigns/${campaignId}/content`);
}

/** "Use this template" from the gallery: creates a draft campaign pre-filled with the template, then opens it. */
export async function createCampaignFromTemplateAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const templateId = String(formData.get("templateId"));

  const { template, locked } = await loadUsableTemplate(workspace, templateId);
  if (!template) redirect("/templates");
  if (locked) redirect("/workspace/billing?upgrade=templates");

  const sender = await getDefaultSender(workspace.id);
  const [campaign] = await db
    .insert(campaigns)
    .values({
      workspaceId: workspace.id,
      name: template.name,
      fromName: sender?.fromName ?? workspace.name,
      fromEmail: sender?.fromEmail ?? `hello@${workspace.slug}.zendmail.demo`,
      replyTo: sender?.replyTo ?? null,
      subject: template.subject ?? "",
      previewText: template.previewText ?? "",
      blocks: template.blocks,
      theme: template.theme,
      templateId: template.id,
    })
    .returning();

  await recordAuditLog({ action: "campaign.created", userId, workspaceId: workspace.id, metadata: { campaignId: campaign.id, templateId: template.id } });
  redirect(`/campaigns/${campaign.id}/content`);
}

export async function updateContentDetailsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  await requireDraftCampaign(workspace.id, campaignId);

  const parsed = contentSchema.safeParse({
    name: formData.get("name"),
    fromName: formData.get("fromName"),
    fromEmail: formData.get("fromEmail"),
    replyTo: formData.get("replyTo") || undefined,
    subject: formData.get("subject"),
    previewText: formData.get("previewText") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db
    .update(campaigns)
    .set({
      name: parsed.data.name,
      fromName: parsed.data.fromName,
      fromEmail: parsed.data.fromEmail,
      replyTo: parsed.data.replyTo || null,
      subject: parsed.data.subject,
      previewText: parsed.data.previewText || null,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  revalidatePath(`/campaigns/${campaignId}/content`);
  return { success: "Saved." };
}

async function updateBlocks(workspaceId: string, campaignId: string, blocks: EmailBlock[]) {
  await requireDraftCampaign(workspaceId, campaignId);
  await db.update(campaigns).set({ blocks, updatedAt: new Date() }).where(eq(campaigns.id, campaignId));
  revalidatePath(`/campaigns/${campaignId}/content`);
}

export async function addBlockAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  const blockType = String(formData.get("blockType"));
  if (!BLOCK_TYPES.includes(blockType as EmailBlock["type"])) return;

  const campaign = await requireDraftCampaign(workspace.id, campaignId);
  const blocks = [...(campaign.blocks as EmailBlock[]), createDefaultBlock(blockType as EmailBlock["type"])];
  await updateBlocks(workspace.id, campaignId, blocks);
}

export async function removeBlockAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  const blockId = String(formData.get("blockId"));

  const campaign = await requireDraftCampaign(workspace.id, campaignId);
  const blocks = (campaign.blocks as EmailBlock[]).filter((b) => b.id !== blockId);
  await updateBlocks(workspace.id, campaignId, blocks);
}

export async function moveBlockAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  const blockId = String(formData.get("blockId"));
  const direction = String(formData.get("direction"));

  const campaign = await requireDraftCampaign(workspace.id, campaignId);
  const blocks = [...(campaign.blocks as EmailBlock[])];
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index === -1) return;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= blocks.length) return;

  [blocks[index], blocks[swapWith]] = [blocks[swapWith], blocks[index]];
  await updateBlocks(workspace.id, campaignId, blocks);
}

export async function reorderBlocksAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  const orderedBlockIdsValue = formData.get("orderedBlockIds");
  if (typeof orderedBlockIdsValue !== "string") return;

  let orderedBlockIds: unknown;
  try {
    orderedBlockIds = JSON.parse(orderedBlockIdsValue);
  } catch {
    return;
  }
  if (!Array.isArray(orderedBlockIds) || !orderedBlockIds.every((id) => typeof id === "string")) return;

  const campaign = await requireDraftCampaign(workspace.id, campaignId);
  const blocks = campaign.blocks as EmailBlock[];
  if (orderedBlockIds.length !== blocks.length || new Set(orderedBlockIds).size !== blocks.length) return;

  const blocksById = new Map(blocks.map((block) => [block.id, block]));
  if (!orderedBlockIds.every((id) => blocksById.has(id))) return;

  await updateBlocks(workspace.id, campaignId, orderedBlockIds.map((id) => blocksById.get(id)!));
}

/** Which fields of the original (simple) block types may be edited through updateBlockFieldAction. */
const LEGACY_EDITABLE: Record<string, string[]> = {
  heading: ["text", "color"],
  text: ["html", "color"],
  image: ["url", "alt"],
  button: ["label", "url", "backgroundColor", "textColor"],
  spacer: ["height"],
};

export async function updateBlockFieldAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  const blockId = String(formData.get("blockId"));
  const field = String(formData.get("field"));
  const value = String(formData.get("value"));
  if (["color", "backgroundColor", "textColor"].includes(field) && !/^#[0-9a-f]{6}$/i.test(value)) return;

  const campaign = await requireDraftCampaign(workspace.id, campaignId);
  const blocks = (campaign.blocks as EmailBlock[]).map((b) => {
    if (b.id !== blockId || !LEGACY_EDITABLE[b.type]?.includes(field)) return b;
    if (field === "height") return { ...b, height: Math.max(0, Math.min(200, Math.round(Number(value)) || 0)) } as EmailBlock;
    if (field === "url" && value.trim() !== "" && !/^(https?:\/\/|\/(?!\/)|asset:art\?)/i.test(value.trim())) return b;
    return { ...b, [field]: value } as EmailBlock;
  });
  await updateBlocks(workspace.id, campaignId, blocks);
}

/** Saves one field of a section block (hero, cards, list …). Path is "headline" or "items.2.title". */
export async function updateSectionFieldAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  const blockId = String(formData.get("blockId"));
  const path = String(formData.get("path"));
  const value = String(formData.get("value") ?? "");

  const campaign = await requireDraftCampaign(workspace.id, campaignId);
  let changed = false;
  const blocks = (campaign.blocks as EmailBlock[]).map((b) => {
    if (b.id !== blockId || !isSectionType(b.type)) return b;
    const updated = setSectionField(b, path, value);
    if (!updated) return b;
    changed = true;
    return updated;
  });
  if (changed) await updateBlocks(workspace.id, campaignId, blocks);
}

/** Add / remove / reorder an item inside a section's list (cards, steps, links …). */
export async function sectionItemAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  const blockId = String(formData.get("blockId"));
  const listKey = String(formData.get("listKey"));
  const op = String(formData.get("op")) as ItemOp;
  const index = Number(formData.get("index") ?? -1);
  if (!["add", "remove", "up", "down"].includes(op)) return;

  const campaign = await requireDraftCampaign(workspace.id, campaignId);
  let changed = false;
  const blocks = (campaign.blocks as EmailBlock[]).map((b) => {
    if (b.id !== blockId) return b;
    const updated = applyItemOp(b, listKey, op, index);
    if (!updated) return b;
    changed = true;
    return updated;
  });
  if (changed) await updateBlocks(workspace.id, campaignId, blocks);
}

/** Saves brand colours, fonts and button shape for the whole email. Every value is re-validated by parseTheme(). */
export async function updateThemeAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  const campaign = await requireDraftCampaign(workspace.id, campaignId);

  const current = parseTheme(campaign.theme);
  const patch: Record<string, string> = {};
  for (const key of ["primary", "secondary", "accent", "bg", "surface", "text", "muted", "headingFont", "bodyFont", "button"]) {
    const v = formData.get(key);
    if (typeof v === "string" && v !== "") patch[key] = v;
  }
  const theme = parseTheme({ ...current, ...patch });
  await db.update(campaigns).set({ theme, updatedAt: new Date() }).where(eq(campaigns.id, campaignId));
  revalidatePath(`/campaigns/${campaignId}/content`);
}

export type TestEmailState = { error?: string; success?: string } | undefined;

export async function sendTestEmailAction(_prev: TestEmailState, formData: FormData): Promise<TestEmailState> {
  const { workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  const campaign = await requireDraftCampaign(workspace.id, campaignId);

  const parsed = testEmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const blocks = campaign.blocks as EmailBlock[];
  const vars = buildVars({ firstName: "Alex", lastName: "Morgan", email: parsed.data.email, businessName: workspace.name, unsubscribeUrl: "#" });
  const renderOptions = { theme: campaign.theme, vars, preheader: campaign.previewText, postalAddress: emailFooterAddress() };
  try {
    await sendCampaignEmail({
      workspaceId: workspace.id,
      source: "TEST",
      to: parsed.data.email,
      fromName: campaign.fromName,
      fromEmail: campaign.fromEmail,
      replyTo: campaign.replyTo,
      subject: `[TEST] ${applyMergeTags(campaign.subject, vars, "text")}`,
      html: renderBlocksToHtml(blocks, null, renderOptions),
      text: renderBlocksToText(blocks, null, renderOptions),
    });
  } catch (error) {
    if (error instanceof SenderNotAuthorizedError) return { error: `${error.message} ${error.resolution}` };
    console.error("Test email failed:", error instanceof Error ? error.message : error);
    return { error: "The test email couldn't be sent. Check your email provider settings and try again." };
  }

  return { success: `Test email sent to ${parsed.data.email}.` };
}

export async function sendCampaignNowAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  await requireDraftCampaign(workspace.id, campaignId);

  let count: number;
  try {
    count = await dispatchCampaign(workspace.id, campaignId, userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The campaign couldn't be sent.";
    redirect(`/campaigns/${campaignId}/review?sendError=${encodeURIComponent(message)}`);
  }
  await recordAuditLog({
    action: "campaign.sent",
    userId,
    workspaceId: workspace.id,
    metadata: { campaignId, recipientCount: count },
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaignId}`);
}

export type ScheduleState = { error?: string } | undefined;

export async function scheduleCampaignAction(_prev: ScheduleState, formData: FormData): Promise<ScheduleState> {
  const { userId, workspace } = await requireWorkspace();
  const campaignId = String(formData.get("campaignId"));
  await requireDraftCampaign(workspace.id, campaignId);

  const parsed = scheduleSchema.safeParse({ scheduledAt: formData.get("scheduledAt") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a date and time." };
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    return { error: "Choose a time in the future." };
  }

  await db
    .update(campaigns)
    .set({ status: "SCHEDULED", scheduledAt, updatedAt: new Date() })
    .where(eq(campaigns.id, campaignId));

  await recordAuditLog({
    action: "campaign.scheduled",
    userId,
    workspaceId: workspace.id,
    metadata: { campaignId, scheduledAt: scheduledAt.toISOString() },
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaignId}`);
}

export async function deleteCampaignAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const campaignId = String(formData.get("id"));

  await db
    .update(campaigns)
    .set({ deletedAt: new Date() })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.workspaceId, workspace.id)));

  await recordAuditLog({ action: "campaign.deleted", userId, workspaceId: workspace.id, metadata: { campaignId } });
  revalidatePath("/campaigns");
  redirect("/campaigns");
}
