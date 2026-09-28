"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { workspaces, workspaceMembers, userActiveWorkspace, plans, subscriptions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { generateUniqueWorkspaceSlug } from "@/lib/workspace-slug";
import { businessInfoSchema, useCaseSchema } from "@/lib/validation/auth";
import { recordAuditLog } from "@/lib/audit";
import type { ActionState } from "./auth-actions";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Step 1 of onboarding: creates the workspace shell plus a free-plan
 * subscription, then immediately routes into business info collection.
 * Called once, right after email verification.
 */
export async function createWorkspaceAction() {
  const user = await requireUser();

  const [existing] = await db
    .select({ workspaceId: userActiveWorkspace.workspaceId })
    .from(userActiveWorkspace)
    .where(eq(userActiveWorkspace.userId, user.id))
    .limit(1);

  if (existing) {
    redirect("/onboarding/business-info");
  }

  const slug = await generateUniqueWorkspaceSlug(`${user.name}'s workspace`);

  const [workspace] = await db
    .insert(workspaces)
    .values({ name: `${user.name}'s workspace`, slug })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: "OWNER",
  });

  await db.insert(userActiveWorkspace).values({
    userId: user.id,
    workspaceId: workspace.id,
  });

  const [freePlan] = await db.select().from(plans).where(eq(plans.key, "free")).limit(1);
  if (freePlan) {
    await db.insert(subscriptions).values({
      workspaceId: workspace.id,
      planId: freePlan.id,
      status: "TRIALING",
    });
  }

  await recordAuditLog({ action: "workspace.created", userId: user.id, workspaceId: workspace.id });

  redirect("/onboarding/business-info");
}

async function getActiveWorkspaceOrRedirect(userId: string) {
  const [row] = await db
    .select({ workspaceId: userActiveWorkspace.workspaceId })
    .from(userActiveWorkspace)
    .where(eq(userActiveWorkspace.userId, userId))
    .limit(1);

  if (!row) redirect("/onboarding/create");
  return row.workspaceId;
}

export async function saveBusinessInfoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const workspaceId = await getActiveWorkspaceOrRedirect(user.id);

  const parsed = businessInfoSchema.safeParse({
    businessName: formData.get("businessName"),
    website: formData.get("website"),
    industry: formData.get("industry"),
    country: formData.get("country"),
    currency: formData.get("currency"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { businessName, website, industry, country, currency, timezone } = parsed.data;

  await db
    .update(workspaces)
    .set({
      name: businessName,
      website: website || null,
      industry,
      country,
      currency,
      timezone,
      onboardingStep: "USE_CASE",
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  redirect("/onboarding/use-case");
}

export async function saveUseCaseAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const workspaceId = await getActiveWorkspaceOrRedirect(user.id);

  const parsed = useCaseSchema.safeParse({ useCase: formData.get("useCase") });
  if (!parsed.success) {
    return { error: "Choose one option to continue." };
  }

  await db
    .update(workspaces)
    .set({ useCase: parsed.data.useCase, onboardingStep: "CONNECT_STORE", updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId));

  redirect("/onboarding/connect-store");
}

/** Used by both "Skip" and any future successful store-connection callback. */
export async function completeOnboardingAction() {
  const user = await requireUser();
  const workspaceId = await getActiveWorkspaceOrRedirect(user.id);

  await db
    .update(workspaces)
    .set({ onboardingStep: "COMPLETE", updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId));

  await recordAuditLog({ action: "workspace.onboarding_completed", userId: user.id, workspaceId });

  redirect("/dashboard");
}
