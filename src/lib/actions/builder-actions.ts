"use server";

import { and, eq, isNull, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { campaigns, emailTemplates } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { canUseTemplate } from "@/lib/template-access";
import { DocumentError, sanitizeDocument } from "@/lib/email-builder/document";

/**
 * Save endpoints for the visual editor. They are called from the browser's autosave loop, so they return a
 * result instead of redirecting. Writes are conditional on `contentRevision` (optimistic concurrency): a
 * second tab or a stale session gets a "conflict" instead of silently overwriting newer work.
 */

export type SaveResult =
  | { ok: true; revision: number; savedAt: string }
  | { ok: false; reason: "auth" | "notfound" | "locked" | "conflict" | "invalid"; message: string };

const saveInput = z.object({ id: z.string().uuid(), expectedRevision: z.number().int().min(0), document: z.unknown() });

async function context() {
  const user = await getCurrentUser();
  if (!user) return null;
  const workspace = await getActiveWorkspaceForUser(user.id);
  return workspace ? { user, workspace } : null;
}

const fail = (reason: Extract<SaveResult, { ok: false }>["reason"], message: string): SaveResult => ({ ok: false, reason, message });

export async function saveCampaignDocument(input: unknown): Promise<SaveResult> {
  const parsed = saveInput.safeParse(input);
  if (!parsed.success) return fail("invalid", "Could not save: bad request.");
  const ctx = await context();
  if (!ctx) return fail("auth", "Your session expired. Sign in again to keep editing.");

  let doc;
  try {
    doc = sanitizeDocument(parsed.data.document);
  } catch (e) {
    return fail("invalid", e instanceof DocumentError ? e.message : "This email could not be saved.");
  }

  const now = new Date();
  const [row] = await db
    .update(campaigns)
    .set({ blocks: doc.blocks, theme: doc.theme, contentRevision: sql`${campaigns.contentRevision} + 1`, updatedAt: now })
    .where(and(
      eq(campaigns.id, parsed.data.id),
      eq(campaigns.workspaceId, ctx.workspace.id),
      eq(campaigns.status, "DRAFT"),
      isNull(campaigns.deletedAt),
      eq(campaigns.contentRevision, parsed.data.expectedRevision),
    ))
    .returning({ revision: campaigns.contentRevision });
  if (row) return { ok: true, revision: row.revision, savedAt: now.toISOString() };

  const [existing] = await db
    .select({ status: campaigns.status })
    .from(campaigns)
    .where(and(eq(campaigns.id, parsed.data.id), eq(campaigns.workspaceId, ctx.workspace.id), isNull(campaigns.deletedAt)))
    .limit(1);
  if (!existing) return fail("notfound", "This campaign no longer exists.");
  if (existing.status !== "DRAFT") return fail("locked", "This campaign has been scheduled or sent, so it can no longer be edited.");
  return fail("conflict", "This email was changed in another tab or window. Reload to get the latest version.");
}

export async function saveTemplateDocument(input: unknown): Promise<SaveResult> {
  const parsed = saveInput.safeParse(input);
  if (!parsed.success) return fail("invalid", "Could not save: bad request.");
  const ctx = await context();
  if (!ctx) return fail("auth", "Your session expired. Sign in again to keep editing.");

  let doc;
  try {
    doc = sanitizeDocument(parsed.data.document);
  } catch (e) {
    return fail("invalid", e instanceof DocumentError ? e.message : "This template could not be saved.");
  }

  const now = new Date();
  const [row] = await db
    .update(emailTemplates)
    .set({ blocks: doc.blocks, theme: doc.theme, contentRevision: sql`${emailTemplates.contentRevision} + 1`, updatedAt: now })
    .where(and(
      eq(emailTemplates.id, parsed.data.id),
      eq(emailTemplates.workspaceId, ctx.workspace.id), // built-in templates (workspaceId null) are never editable in place
      eq(emailTemplates.contentRevision, parsed.data.expectedRevision),
    ))
    .returning({ revision: emailTemplates.contentRevision });
  if (row) return { ok: true, revision: row.revision, savedAt: now.toISOString() };

  const [existing] = await db
    .select({ id: emailTemplates.id })
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, parsed.data.id), eq(emailTemplates.workspaceId, ctx.workspace.id)))
    .limit(1);
  return existing
    ? fail("conflict", "This template was changed in another tab or window. Reload to get the latest version.")
    : fail("notfound", "This template no longer exists.");
}

/** Renames a workspace template (the editor's title field). */
export async function renameTemplateAction(id: string, name: string): Promise<{ ok: boolean }> {
  const ctx = await context();
  const clean = name.trim().slice(0, 80);
  if (!ctx || clean.length < 2 || !z.string().uuid().safeParse(id).success) return { ok: false };
  const result = await db
    .update(emailTemplates)
    .set({ name: clean, updatedAt: new Date() })
    .where(and(eq(emailTemplates.id, id), eq(emailTemplates.workspaceId, ctx.workspace.id)))
    .returning({ id: emailTemplates.id });
  return { ok: result.length > 0 };
}

/**
 * "Customize": copies a built-in (or any visible) template into the workspace and opens it in the editor.
 * Pro templates need a paid plan, enforced here as everywhere a template is applied.
 */
export async function customizeTemplateAction(formData: FormData) {
  const ctx = await context();
  if (!ctx) redirect("/login");
  const templateId = z.string().uuid().safeParse(String(formData.get("templateId")));
  if (!templateId.success) redirect("/templates");

  const [source] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, templateId.data), or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, ctx.workspace.id))))
    .limit(1);
  if (!source) redirect("/templates");
  if (!canUseTemplate(ctx.workspace.planName, source.tier)) redirect("/workspace/billing?upgrade=templates");

  // Editing your own template opens it directly; built-ins are copied first.
  if (source.workspaceId === ctx.workspace.id) redirect(`/templates/${source.id}/editor`);

  const [copy] = await db
    .insert(emailTemplates)
    .values({
      workspaceId: ctx.workspace.id,
      name: `${source.name} (copy)`.slice(0, 80),
      description: source.description,
      category: source.category,
      tier: "FREE", // a workspace's own copy is theirs to use; plan gating applied when it was copied
      subject: source.subject,
      previewText: source.previewText,
      blocks: source.blocks,
      theme: source.theme,
    })
    .returning({ id: emailTemplates.id });

  await recordAuditLog({ action: "template.customized", userId: ctx.user.id, workspaceId: ctx.workspace.id, metadata: { from: source.id, to: copy.id } });
  revalidatePath("/templates");
  redirect(`/templates/${copy.id}/editor`);
}

/** Saves a campaign's current design as a reusable workspace template. */
export async function saveCampaignAsTemplateAction(campaignId: string, name: string): Promise<{ ok: boolean; templateId?: string; message?: string }> {
  const ctx = await context();
  const clean = name.trim().slice(0, 80);
  if (!ctx || !z.string().uuid().safeParse(campaignId).success) return { ok: false, message: "Could not save the template." };
  if (clean.length < 2) return { ok: false, message: "Give the template a name (at least 2 characters)." };

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.workspaceId, ctx.workspace.id), isNull(campaigns.deletedAt)))
    .limit(1);
  if (!campaign) return { ok: false, message: "Campaign not found." };

  const [template] = await db
    .insert(emailTemplates)
    .values({
      workspaceId: ctx.workspace.id,
      name: clean,
      category: "CUSTOM",
      subject: campaign.subject || null,
      previewText: campaign.previewText,
      blocks: campaign.blocks,
      theme: campaign.theme,
    })
    .returning({ id: emailTemplates.id });

  await recordAuditLog({ action: "template.created", userId: ctx.user.id, workspaceId: ctx.workspace.id, metadata: { name: clean, fromCampaign: campaignId } });
  revalidatePath("/templates");
  return { ok: true, templateId: template.id };
}
