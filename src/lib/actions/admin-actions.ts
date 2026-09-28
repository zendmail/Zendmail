"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { users, plans, featureFlags, sessions } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/guard";
import { recordAuditLog } from "@/lib/audit";

export async function suspendUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));

  await db.update(users).set({ suspendedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
  // Suspending someone should end any session they're currently using.
  await db.delete(sessions).where(eq(sessions.userId, userId));

  await recordAuditLog({ action: "admin.user_suspended", userId: admin.id, metadata: { targetUserId: userId } });
  revalidatePath("/admin/users");
}

export async function reinstateUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));

  await db.update(users).set({ suspendedAt: null, updatedAt: new Date() }).where(eq(users.id, userId));

  await recordAuditLog({ action: "admin.user_reinstated", userId: admin.id, metadata: { targetUserId: userId } });
  revalidatePath("/admin/users");
}

export async function updatePlanLimitsAction(formData: FormData) {
  const admin = await requireAdmin();
  const planId = String(formData.get("planId"));

  const priceMonthly = formData.get("priceMonthly");
  const contactLimit = formData.get("contactLimit");
  const emailSendLimit = formData.get("emailSendLimit");
  const aiGenerationLimit = formData.get("aiGenerationLimit");

  await db
    .update(plans)
    .set({
      priceMonthly: priceMonthly ? String(priceMonthly) : null,
      contactLimit: contactLimit ? Number(contactLimit) : null,
      emailSendLimit: emailSendLimit ? Number(emailSendLimit) : null,
      aiGenerationLimit: aiGenerationLimit ? Number(aiGenerationLimit) : null,
    })
    .where(eq(plans.id, planId));

  await recordAuditLog({ action: "admin.plan_updated", userId: admin.id, metadata: { planId } });
  revalidatePath("/admin/plans");
}

export async function toggleFeatureFlagAction(formData: FormData) {
  const admin = await requireAdmin();
  const flagId = String(formData.get("flagId"));
  const nextValue = formData.get("nextValue") === "true";

  await db.update(featureFlags).set({ enabled: nextValue, updatedAt: new Date() }).where(eq(featureFlags.id, flagId));

  await recordAuditLog({
    action: "admin.feature_flag_toggled",
    userId: admin.id,
    metadata: { flagId, enabled: nextValue },
  });
  revalidatePath("/admin/feature-flags");
}
