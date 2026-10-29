"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { automations, automationSteps, emailTemplates, type EmailBlock } from "@/db/schema";
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
    "SEASONAL",
    "DIGITAL_PRODUCT",
    "SERVICE",
  ]),
  subject: z.string().trim().min(1, "Enter an email subject.").max(120),
  previewText: z.string().trim().max(160, "Preview text must be 160 characters or fewer.").optional().or(z.literal("")),
});

export async function createTemplateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const parsed = createTemplateSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
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

  await db.insert(emailTemplates).values({
    workspaceId: workspace.id,
    name: parsed.data.name,
    category: parsed.data.category,
    subject: parsed.data.subject,
    previewText: parsed.data.previewText || null,
    blocks,
  });

  await recordAuditLog({
    action: "template.created",
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { name: parsed.data.name, category: parsed.data.category },
  });

  revalidatePath("/templates");
  redirect("/templates");
}

/** Deletes one of the workspace's own templates. Built-in templates can never be deleted, and a template that an
 *  automation still sends is refused so that automation does not break. Campaigns keep their own copy of the content. */
export async function deleteTemplateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const id = z.string().uuid().safeParse(String(formData.get("templateId")));
  if (!id.success) return { error: "Template not found." };

  const [template] = await db
    .select({ id: emailTemplates.id, name: emailTemplates.name })
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, id.data), eq(emailTemplates.workspaceId, workspace.id)))
    .limit(1);
  if (!template) return { error: "Template not found." };

  const [inUse] = await db
    .select({ id: automationSteps.id })
    .from(automationSteps)
    .innerJoin(automations, eq(automations.id, automationSteps.automationId))
    .where(
      and(
        eq(automations.workspaceId, workspace.id),
        sql`${automations.deletedAt} is null`,
        sql`${automationSteps.config}->>'templateId' = ${template.id}`
      )
    )
    .limit(1);
  if (inUse) return { error: "An automation still uses this template. Change or remove that step first." };

  await db.delete(emailTemplates).where(and(eq(emailTemplates.id, template.id), eq(emailTemplates.workspaceId, workspace.id)));
  await recordAuditLog({ action: "template.deleted", userId: user.id, workspaceId: workspace.id, metadata: { name: template.name } });
  revalidatePath("/templates");
  return {};
}
