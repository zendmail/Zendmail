"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { automations, automationSteps, type AutomationStepConfig } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { createAutomationSchema } from "@/lib/validation/automations";
import { processDueRuns } from "@/lib/automation-engine";
import type { ActionState } from "@/lib/actions/auth-actions";

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspace };
}

async function requireAutomation(workspaceId: string, automationId: string) {
  const [automation] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, automationId), eq(automations.workspaceId, workspaceId)))
    .limit(1);
  if (!automation) redirect("/automations");
  return automation;
}

export async function createAutomationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, workspace } = await requireWorkspace();

  const parsed = createAutomationSchema.safeParse({
    name: formData.get("name"),
    triggerType: formData.get("triggerType"),
    tagName: formData.get("tagName") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  if (parsed.data.triggerType === "TAG_ADDED" && !parsed.data.tagName) {
    return { error: "Enter the tag name that should trigger this automation." };
  }

  const [automation] = await db
    .insert(automations)
    .values({
      workspaceId: workspace.id,
      name: parsed.data.name,
      triggerType: parsed.data.triggerType,
      triggerConfig: parsed.data.triggerType === "TAG_ADDED" ? { tagName: parsed.data.tagName! } : {},
    })
    .returning();

  await recordAuditLog({ action: "automation.created", userId, workspaceId: workspace.id, metadata: { automationId: automation.id } });
  redirect(`/automations/${automation.id}`);
}

export async function addStepAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const automationId = String(formData.get("automationId"));
  const type = String(formData.get("stepType")) as (typeof automationSteps.$inferSelect)["type"];
  await requireAutomation(workspace.id, automationId);

  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${automationSteps.order}), -1)::int` })
    .from(automationSteps)
    .where(eq(automationSteps.automationId, automationId));

  const defaultConfig: AutomationStepConfig =
    type === "WAIT" ? { minutes: 60 } : type === "SEND_EMAIL" ? { templateId: "" } : { tagName: "" };

  await db.insert(automationSteps).values({ automationId, order: maxOrder + 1, type, config: defaultConfig });
  revalidatePath(`/automations/${automationId}`);
}

export async function removeStepAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const automationId = String(formData.get("automationId"));
  const stepId = String(formData.get("stepId"));
  await requireAutomation(workspace.id, automationId);

  await db.delete(automationSteps).where(eq(automationSteps.id, stepId));
  revalidatePath(`/automations/${automationId}`);
}

export async function updateStepConfigAction(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const automationId = String(formData.get("automationId"));
  const stepId = String(formData.get("stepId"));
  const field = String(formData.get("field"));
  const value = String(formData.get("value"));
  await requireAutomation(workspace.id, automationId);

  const [step] = await db.select().from(automationSteps).where(eq(automationSteps.id, stepId)).limit(1);
  if (!step) return;

  const config = { ...(step.config as Record<string, unknown>), [field]: field === "minutes" ? Number(value) : value };
  await db.update(automationSteps).set({ config: config as AutomationStepConfig }).where(eq(automationSteps.id, stepId));
  revalidatePath(`/automations/${automationId}`);
}

export async function activateAutomationAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const automationId = String(formData.get("automationId"));
  await requireAutomation(workspace.id, automationId);

  const steps = await db.select().from(automationSteps).where(eq(automationSteps.automationId, automationId));
  if (steps.length === 0) return;

  await db.update(automations).set({ status: "ACTIVE", updatedAt: new Date() }).where(eq(automations.id, automationId));
  await recordAuditLog({ action: "automation.activated", userId, workspaceId: workspace.id, metadata: { automationId } });
  revalidatePath(`/automations/${automationId}`);
  revalidatePath("/automations");
}

export async function pauseAutomationAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const automationId = String(formData.get("automationId"));
  await requireAutomation(workspace.id, automationId);

  await db.update(automations).set({ status: "PAUSED", updatedAt: new Date() }).where(eq(automations.id, automationId));
  await recordAuditLog({ action: "automation.paused", userId, workspaceId: workspace.id, metadata: { automationId } });
  revalidatePath(`/automations/${automationId}`);
  revalidatePath("/automations");
}

export async function deleteAutomationAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const automationId = String(formData.get("id"));

  await db
    .update(automations)
    .set({ deletedAt: new Date() })
    .where(and(eq(automations.id, automationId), eq(automations.workspaceId, workspace.id)));

  await recordAuditLog({ action: "automation.deleted", userId, workspaceId: workspace.id, metadata: { automationId } });
  revalidatePath("/automations");
  redirect("/automations");
}

/** Manual stand-in for the background worker/cron that would process due WAIT steps in production. */
export async function processDueRunsAction() {
  const { workspace } = await requireWorkspace();
  await processDueRuns(workspace.id);
  revalidatePath("/automations");
}
