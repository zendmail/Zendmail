"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { workspaces } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { businessInfoSchema } from "@/lib/validation/auth";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/actions/auth-actions";

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspace };
}

export async function updateWorkspaceSettingsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, workspace } = await requireWorkspace();

  const parsed = businessInfoSchema.safeParse({
    businessName: formData.get("businessName"),
    website: formData.get("website") || undefined,
    industry: formData.get("industry"),
    country: formData.get("country"),
    currency: formData.get("currency"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db
    .update(workspaces)
    .set({
      name: parsed.data.businessName,
      website: parsed.data.website || null,
      industry: parsed.data.industry,
      country: parsed.data.country,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspace.id));

  await recordAuditLog({ action: "workspace.settings_updated", userId, workspaceId: workspace.id });
  revalidatePath("/workspace/settings");
  return { success: "Settings saved." };
}

const frequencySchema = z.object({
  maxEmailsPerContactPerWeek: z.coerce.number().int().min(1, "Must be at least 1").max(50, "That's a lot — double check this number"),
});

export async function updateFrequencyGuardAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, workspace } = await requireWorkspace();

  const parsed = frequencySchema.safeParse({
    maxEmailsPerContactPerWeek: formData.get("maxEmailsPerContactPerWeek"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid number." };
  }

  await db
    .update(workspaces)
    .set({ maxEmailsPerContactPerWeek: parsed.data.maxEmailsPerContactPerWeek, updatedAt: new Date() })
    .where(eq(workspaces.id, workspace.id));

  await recordAuditLog({
    action: "workspace.frequency_cap_updated",
    userId,
    workspaceId: workspace.id,
    metadata: { maxEmailsPerContactPerWeek: parsed.data.maxEmailsPerContactPerWeek },
  });
  revalidatePath("/workspace/settings");
  return { success: "Send Frequency Guard updated." };
}
