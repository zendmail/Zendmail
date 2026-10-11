import { redirect } from "next/navigation";
import { asc, eq, isNull, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { db } from "@/db/client";
import { emailTemplates } from "@/db/schema";
import { canUseTemplate } from "@/lib/template-access";
import { TemplatesLibrary } from "@/components/templates/templates-library";

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const rows = await db
    .select({
      id: emailTemplates.id,
      name: emailTemplates.name,
      description: emailTemplates.description,
      category: emailTemplates.category,
      tier: emailTemplates.tier,
      subject: emailTemplates.subject,
      workspaceId: emailTemplates.workspaceId,
    })
    .from(emailTemplates)
    .where(or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id)))
    // Built-in designs first (by their curated order), then the workspace's own templates.
    .orderBy(sql`(${emailTemplates.workspaceId} is not null)`, asc(emailTemplates.sortOrder), asc(emailTemplates.createdAt));

  const templates = rows.map(({ workspaceId, ...t }) => ({ ...t, isBuiltIn: workspaceId === null }));

  return <TemplatesLibrary templates={templates} canUsePro={canUseTemplate(workspace.planName, "PRO")} planName={workspace.planName} />;
}
