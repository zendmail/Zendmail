"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { campaigns } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { generateEmail, transformEmail, type GeneratedEmail } from "@/lib/ai/email-writer";
import { AiNotConfiguredError } from "@/lib/ai/provider";

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspace };
}

export type AiStudioState = {
  email?: GeneratedEmail;
  error?: string;
  instruction?: string;
} | undefined;

function friendlyAiError(err: unknown) {
  if (err instanceof AiNotConfiguredError) {
    return "AI Studio isn't connected yet — set AI_PROVIDER_API_KEY in your environment to enable it.";
  }
  return err instanceof Error ? err.message : "Something went wrong generating this email.";
}

export async function generateEmailAction(_prev: AiStudioState, formData: FormData): Promise<AiStudioState> {
  const { userId, workspace } = await requireWorkspace();
  const instruction = String(formData.get("instruction") || "").trim();
  if (!instruction) return { error: "Describe the email you want to create." };

  const contextualInstruction = `Business: ${workspace.name}${workspace.industry ? ` (${workspace.industry})` : ""}.\nRequest: ${instruction}`;

  try {
    const email = await generateEmail(contextualInstruction);
    await recordAuditLog({ action: "ai.email_generated", userId, workspaceId: workspace.id, metadata: { instruction } });
    return { email, instruction };
  } catch (err) {
    return { error: friendlyAiError(err), instruction };
  }
}

export async function transformEmailAction(_prev: AiStudioState, formData: FormData): Promise<AiStudioState> {
  const { userId, workspace } = await requireWorkspace();
  const currentRaw = String(formData.get("currentEmail") || "");
  const transform = String(formData.get("transform") || "improve");
  const targetLanguage = String(formData.get("targetLanguage") || "") || undefined;
  const instruction = String(formData.get("instruction") || "");

  let current: GeneratedEmail;
  try {
    current = JSON.parse(currentRaw);
  } catch {
    return { error: "Lost track of the current draft — try generating again.", instruction };
  }

  try {
    const email =
      transform === "regenerate"
        ? await generateEmail(`Business: ${workspace.name}.\nRequest: ${instruction}`)
        : await transformEmail(current, transform, targetLanguage);
    await recordAuditLog({ action: "ai.email_transformed", userId, workspaceId: workspace.id, metadata: { transform } });
    return { email, instruction };
  } catch (err) {
    return { error: friendlyAiError(err), email: current, instruction };
  }
}

export async function createCampaignFromGeneratedAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const currentRaw = String(formData.get("currentEmail") || "");
  const email: GeneratedEmail = JSON.parse(currentRaw);

  const [campaign] = await db
    .insert(campaigns)
    .values({
      workspaceId: workspace.id,
      name: email.subject || "AI-generated campaign",
      fromName: workspace.name,
      fromEmail: `hello@${workspace.slug}.zendmail.demo`,
      subject: email.subject,
      previewText: email.previewText,
      blocks: email.blocks,
    })
    .returning();

  await recordAuditLog({
    action: "campaign.created_from_ai",
    userId,
    workspaceId: workspace.id,
    metadata: { campaignId: campaign.id },
  });

  redirect(`/campaigns/${campaign.id}/audience`);
}
