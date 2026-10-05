"use server";

import { z } from "zod";
import { and, eq, isNull, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { emailTemplates, type EmailBlock } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { createDefaultBlock } from "@/lib/email-blocks";
import type { ActionState } from "@/lib/actions/auth-actions";

const createTemplateSchema = z.object({
  name: z.string().trim().min(2, "Template name must be at least 2 characters.").max(80),
  category: z.enum([
    "WELCOME",
    "NEWSLETTER",
    "PROMOTIONAL",
    "ABANDONED_CART",
    "POST_PURCHASE",
    "WIN_BACK",
    "PRODUCT_LAUNCH",
    "SALE",
    "THANK_YOU",
    "CUSTOM",
  ]),
  subject: z.string().trim().min(1, "Enter an email subject.").max(120),
  previewText: z.string().trim().max(160, "Preview text must be 160 characters or fewer.").optional().or(z.literal("")),
});

const templateUpdateSchema = z.object({
  name: z.string().trim().min(2, "Template name must be at least 2 characters.").max(80),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  previewText: z.string().trim().max(160).optional().or(z.literal("")),
  blocks: z.string().optional().default("[]"),
  category: z.string().default("CUSTOM"),
});

function normalizeBlocks(value: string | null | undefined): EmailBlock[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is EmailBlock => !!item && typeof item === "object" && "id" in item && "type" in item) as EmailBlock[];
  } catch {
    return [];
  }
}

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { user, workspace };
}

export async function createTemplateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const { user, workspace } = await requireWorkspace();

  const parsed = createTemplateSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || "CUSTOM",
    subject: formData.get("subject"),
    previewText: formData.get("previewText"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const heading = createDefaultBlock("heading");
  if (heading.type === "heading") heading.text = parsed.data.name;
  const blocks: EmailBlock[] = [
    heading,
    createDefaultBlock("text"),
    createDefaultBlock("button"),
    createDefaultBlock("footer"),
  ];

  const [template] = await db.insert(emailTemplates).values({
    workspaceId: workspace.id,
    name: parsed.data.name,
    category: parsed.data.category,
    subject: parsed.data.subject,
    previewText: parsed.data.previewText || null,
    blocks,
  }).returning();

  await recordAuditLog({
    action: "template.created",
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { name: parsed.data.name, category: parsed.data.category },
  });

  revalidatePath("/templates");
  redirect(`/templates/${template.id}/edit`);
}

export async function saveTemplateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const { user, workspace } = await requireWorkspace();
  const templateId = String(formData.get("templateId") || "");

  const parsed = templateUpdateSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    previewText: formData.get("previewText"),
    blocks: formData.get("blocks"),
    category: formData.get("category") || "CUSTOM",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  if (!templateId) {
    const [template] = await db.insert(emailTemplates).values({
      workspaceId: workspace.id,
      name: parsed.data.name,
      category: parsed.data.category as (typeof emailTemplates.category.enumValues)[number],
      subject: parsed.data.subject || null,
      previewText: parsed.data.previewText || null,
      blocks: normalizeBlocks(parsed.data.blocks),
    }).returning();

    await recordAuditLog({ action: "template.created", userId: user.id, workspaceId: workspace.id, metadata: { name: parsed.data.name } });
    revalidatePath("/templates");
    redirect(`/templates/${template.id}/edit`);
  }

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, templateId), or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id))))
    .limit(1);

  if (!template) {
    return { error: "Template not found." };
  }

  await db.update(emailTemplates).set({
    name: parsed.data.name,
    category: parsed.data.category as (typeof emailTemplates.category.enumValues)[number],
    subject: parsed.data.subject || null,
    previewText: parsed.data.previewText || null,
    blocks: normalizeBlocks(parsed.data.blocks),
    updatedAt: new Date(),
  }).where(eq(emailTemplates.id, templateId));

  await recordAuditLog({
    action: "template.updated",
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { templateId, name: parsed.data.name },
  });

  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}/edit`);
  return { success: "Saved." };
}

export async function saveAsNewTemplateAction(formData: FormData): Promise<ActionState> {
  const { user, workspace } = await requireWorkspace();
  const templateId = String(formData.get("templateId") || "");

  const parsed = templateUpdateSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    previewText: formData.get("previewText"),
    blocks: formData.get("blocks"),
    category: formData.get("category") || "CUSTOM",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const sourceTemplate = templateId
    ? await db
        .select()
        .from(emailTemplates)
        .where(and(eq(emailTemplates.id, templateId), or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id))))
        .limit(1)
        .then(([result]) => result)
    : null;

  const baseName = (parsed.data.name || sourceTemplate?.name || "Untitled template").trim();
  const nextName = baseName.endsWith(" copy") ? baseName : `${baseName} copy`;
  const normalizedBlocks = normalizeBlocks(parsed.data.blocks);
  const blocks = normalizedBlocks.length > 0 ? normalizedBlocks : (sourceTemplate?.blocks ?? []);

  const [duplicate] = await db.insert(emailTemplates).values({
    workspaceId: workspace.id,
    name: nextName,
    category: (parsed.data.category || sourceTemplate?.category || "CUSTOM") as (typeof emailTemplates.category.enumValues)[number],
    subject: parsed.data.subject || sourceTemplate?.subject || null,
    previewText: parsed.data.previewText || sourceTemplate?.previewText || null,
    blocks,
  }).returning();

  await recordAuditLog({
    action: "template.duplicated",
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { sourceTemplateId: sourceTemplate?.id ?? null, duplicateTemplateId: duplicate.id, name: nextName },
  });

  revalidatePath("/templates");
  redirect(`/templates/${duplicate.id}/edit`);
}

export async function duplicateTemplateAction(formData: FormData) {
  const { user, workspace } = await requireWorkspace();
  const templateId = String(formData.get("templateId") || "");
  if (!templateId) return;

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, templateId), or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id))))
    .limit(1);

  if (!template) return;

  const [duplicate] = await db.insert(emailTemplates).values({
    workspaceId: workspace.id,
    name: `${template.name} copy`,
    category: template.category,
    subject: template.subject,
    previewText: template.previewText,
    blocks: template.blocks as EmailBlock[],
  }).returning();

  await recordAuditLog({
    action: "template.duplicated",
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { sourceTemplateId: template.id, duplicateTemplateId: duplicate.id },
  });

  revalidatePath("/templates");
  redirect(`/templates/${duplicate.id}/edit`);
}

export async function archiveTemplateAction(formData: FormData) {
  const { user, workspace } = await requireWorkspace();
  const templateId = String(formData.get("templateId") || "");
  if (!templateId) return;

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, templateId), or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id))))
    .limit(1);
  if (!template) return;

  await db.update(emailTemplates).set({
    category: "CUSTOM",
    updatedAt: new Date(),
  }).where(eq(emailTemplates.id, templateId));

  await recordAuditLog({
    action: "template.archived",
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { templateId },
  });

  revalidatePath("/templates");
  redirect("/templates");
}

export async function deleteTemplateAction(formData: FormData) {
  const { user, workspace } = await requireWorkspace();
  const templateId = String(formData.get("templateId") || "");
  if (!templateId) return;

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, templateId), or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id))))
    .limit(1);
  if (!template) return;

  await db.delete(emailTemplates).where(eq(emailTemplates.id, templateId));
  await recordAuditLog({
    action: "template.deleted",
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { templateId, name: template.name },
  });

  revalidatePath("/templates");
  redirect("/templates");
}
