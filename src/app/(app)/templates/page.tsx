import { redirect } from "next/navigation";
import { eq, isNull, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { db } from "@/db/client";
import { emailTemplates } from "@/db/schema";
import { TemplatesLibrary } from "@/components/templates/templates-library";

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const templates = await db
    .select()
    .from(emailTemplates)
    .where(or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id)));

  return <TemplatesLibrary templates={templates} />;
}
