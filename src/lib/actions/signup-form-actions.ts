"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { signupForms, workspaces } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { rateLimit, rateLimitByKey } from "@/lib/rate-limit";
import { defaultConsentText, getPublicForm, newPublicId, publicSignupSchema, signupFormSchema, submitSignup } from "@/lib/signup-forms";
import type { ActionState } from "@/lib/actions/auth-actions";

const MAX_FORMS = 20;

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspace };
}

async function ownForm(workspaceId: string, formId: string) {
  const [form] = await db
    .select()
    .from(signupForms)
    .where(and(eq(signupForms.id, formId), eq(signupForms.workspaceId, workspaceId)))
    .limit(1);
  return form ?? null;
}

/** Creates a form with sensible defaults (double opt-in on) and opens it for editing. */
export async function createSignupFormAction() {
  const { userId, workspace } = await requireWorkspace();
  const existing = await db.select({ id: signupForms.id }).from(signupForms).where(eq(signupForms.workspaceId, workspace.id));
  if (existing.length >= MAX_FORMS) redirect("/forms");

  const [form] = await db
    .insert(signupForms)
    .values({
      workspaceId: workspace.id,
      publicId: newPublicId(),
      name: "Newsletter signup",
      title: `Stay in touch with ${workspace.name}`,
      description: "Get news, offers and updates straight to your inbox.",
      buttonLabel: "Subscribe",
      successMessage: "",
      consentText: defaultConsentText(workspace.name),
    })
    .returning({ id: signupForms.id });
  await recordAuditLog({ action: "form.created", userId, workspaceId: workspace.id, metadata: { formId: form.id } });
  revalidatePath("/forms");
  redirect(`/forms/${form.id}`);
}

export async function updateSignupFormAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, workspace } = await requireWorkspace();
  const form = await ownForm(workspace.id, String(formData.get("formId")));
  if (!form) return { error: "Form not found." };

  const parsed = signupFormSchema.safeParse({
    name: formData.get("name"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    buttonLabel: formData.get("buttonLabel"),
    successMessage: formData.get("successMessage") ?? "",
    collectName: formData.get("collectName") === "on",
    consentText: formData.get("consentText"),
    doubleOptIn: formData.get("doubleOptIn") === "on",
    accentColor: formData.get("accentColor"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  await db.update(signupForms).set({ ...parsed.data, updatedAt: new Date() }).where(eq(signupForms.id, form.id));
  await recordAuditLog({ action: "form.updated", userId, workspaceId: workspace.id, metadata: { formId: form.id } });
  revalidatePath("/forms");
  revalidatePath(`/forms/${form.id}`);
  revalidatePath(`/f/${form.publicId}`);
  return { success: "Saved." };
}

export async function setSignupFormStatusAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const form = await ownForm(workspace.id, String(formData.get("formId")));
  if (!form) return;
  const status = form.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
  await db.update(signupForms).set({ status, updatedAt: new Date() }).where(eq(signupForms.id, form.id));
  await recordAuditLog({ action: "form.status", userId, workspaceId: workspace.id, metadata: { formId: form.id, status } });
  revalidatePath("/forms");
  revalidatePath(`/forms/${form.id}`);
  revalidatePath(`/f/${form.publicId}`);
}

export async function deleteSignupFormAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const form = await ownForm(workspace.id, String(formData.get("formId")));
  if (!form) redirect("/forms");
  await db.delete(signupForms).where(eq(signupForms.id, form.id));
  await recordAuditLog({ action: "form.deleted", userId, workspaceId: workspace.id, metadata: { formId: form.id } });
  revalidatePath("/forms");
  redirect("/forms");
}

/**
 * Public submission (no login). Always answers the same way for valid input so it cannot be used to discover which
 * addresses are already contacts. Bots are slowed by a hidden field and per-IP / per-address limits.
 */
export async function submitSignupFormAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const publicId = String(formData.get("publicId") ?? "");
  const form = await getPublicForm(publicId);
  if (!form || form.status !== "ACTIVE") return { error: "This form is not accepting signups right now." };

  const parsed = publicSignupSchema.safeParse({
    email: formData.get("email"),
    firstName: String(formData.get("firstName") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };

  // Honeypot: real people never see or fill this field.
  const trap = String(formData.get("company_website") ?? "");
  const ok = form.successMessage || (form.doubleOptIn ? "Almost done! Check your inbox and click the link to confirm." : "Thanks, you're subscribed!");
  if (trap) return { success: ok };

  if (formData.get("consent") !== "on") return { error: "Please tick the box to agree before subscribing." };

  const byIp = await rateLimit(`signup-form:${form.id}`, 12, 3600);
  if (!byIp.allowed) return { error: byIp.message };
  const byEmail = await rateLimitByKey(`signup-form-email:${form.id}`, parsed.data.email, 3, 3600);
  if (!byEmail.allowed) return { success: ok };

  const [workspace] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, form.workspaceId)).limit(1);
  await submitSignup({ form, workspaceName: workspace?.name ?? "this business", email: parsed.data.email, firstName: parsed.data.firstName });
  return { success: ok };
}
