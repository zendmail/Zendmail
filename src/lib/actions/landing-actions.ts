"use server";

import { and, eq, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { landingPages, signupForms } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { landingSettingsSchema, MAX_LANDING_PAGES, newLandingPublicId, starterBlocks } from "@/lib/landing-pages";
import type { ActionState } from "@/lib/actions/auth-actions";

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspace };
}

async function ownPage(workspaceId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [page] = await db.select().from(landingPages).where(and(eq(landingPages.id, id), eq(landingPages.workspaceId, workspaceId))).limit(1);
  return page ?? null;
}

/** Creates a draft with a starter layout (and the workspace's only signup form, if there is exactly one) and opens the editor. */
export async function createLandingPageAction() {
  const { userId, workspace } = await requireWorkspace();
  const [{ n }] = await db.select({ n: count() }).from(landingPages).where(eq(landingPages.workspaceId, workspace.id));
  if (n >= MAX_LANDING_PAGES) redirect("/landing-pages");

  const forms = await db.select({ id: signupForms.id }).from(signupForms).where(eq(signupForms.workspaceId, workspace.id)).limit(2);
  const [page] = await db
    .insert(landingPages)
    .values({
      workspaceId: workspace.id,
      publicId: newLandingPublicId(),
      name: "New landing page",
      seoTitle: workspace.name,
      blocks: starterBlocks(workspace.name),
      formId: forms.length === 1 ? forms[0].id : null,
    })
    .returning({ id: landingPages.id });
  await recordAuditLog({ action: "landing.created", userId, workspaceId: workspace.id, metadata: { pageId: page.id } });
  revalidatePath("/landing-pages");
  redirect(`/landing-pages/${page.id}/editor`);
}

export async function updateLandingSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, workspace } = await requireWorkspace();
  const page = await ownPage(workspace.id, String(formData.get("pageId")));
  if (!page) return { error: "Page not found." };

  const rawForm = String(formData.get("formId") ?? "");
  const parsed = landingSettingsSchema.safeParse({
    name: formData.get("name"),
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    formId: rawForm || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details and try again." };

  // A page can only show a form that belongs to the same workspace.
  if (parsed.data.formId) {
    const [form] = await db
      .select({ id: signupForms.id })
      .from(signupForms)
      .where(and(eq(signupForms.id, parsed.data.formId), eq(signupForms.workspaceId, workspace.id)))
      .limit(1);
    if (!form) return { error: "That signup form no longer exists." };
  }

  await db.update(landingPages).set({ ...parsed.data, updatedAt: new Date() }).where(eq(landingPages.id, page.id));
  await recordAuditLog({ action: "landing.updated", userId, workspaceId: workspace.id, metadata: { pageId: page.id } });
  revalidatePath("/landing-pages");
  revalidatePath(`/landing-pages/${page.id}`);
  revalidatePath(`/p/${page.publicId}`);
  return { success: "Saved." };
}

export async function setLandingStatusAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const page = await ownPage(workspace.id, String(formData.get("pageId")));
  if (!page) return;
  const publish = page.status !== "PUBLISHED";
  if (publish && page.blocks.length === 0) return; // an empty page is never published
  await db
    .update(landingPages)
    .set({ status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : page.publishedAt, updatedAt: new Date() })
    .where(eq(landingPages.id, page.id));
  await recordAuditLog({ action: publish ? "landing.published" : "landing.unpublished", userId, workspaceId: workspace.id, metadata: { pageId: page.id } });
  revalidatePath("/landing-pages");
  revalidatePath(`/landing-pages/${page.id}`);
  revalidatePath(`/p/${page.publicId}`);
}

export async function duplicateLandingPageAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const page = await ownPage(workspace.id, String(formData.get("pageId")));
  if (!page) redirect("/landing-pages");
  const [{ n }] = await db.select({ n: count() }).from(landingPages).where(eq(landingPages.workspaceId, workspace.id));
  if (n >= MAX_LANDING_PAGES) redirect("/landing-pages");
  const [copy] = await db
    .insert(landingPages)
    .values({
      workspaceId: workspace.id,
      publicId: newLandingPublicId(),
      name: `${page.name} (copy)`.slice(0, 80),
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      blocks: page.blocks,
      theme: page.theme,
      formId: page.formId,
    })
    .returning({ id: landingPages.id });
  await recordAuditLog({ action: "landing.duplicated", userId, workspaceId: workspace.id, metadata: { from: page.id, to: copy.id } });
  revalidatePath("/landing-pages");
  redirect(`/landing-pages/${copy.id}`);
}

export async function deleteLandingPageAction(formData: FormData) {
  const { userId, workspace } = await requireWorkspace();
  const page = await ownPage(workspace.id, String(formData.get("pageId")));
  if (!page) redirect("/landing-pages");
  await db.delete(landingPages).where(eq(landingPages.id, page.id));
  await recordAuditLog({ action: "landing.deleted", userId, workspaceId: workspace.id, metadata: { pageId: page.id } });
  revalidatePath("/landing-pages");
  revalidatePath(`/p/${page.publicId}`);
  redirect("/landing-pages");
}
