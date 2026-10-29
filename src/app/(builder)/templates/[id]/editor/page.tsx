import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { emailTemplates } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { parseTheme } from "@/lib/email-builder/theme";
import { Builder } from "@/components/builder/builder";

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, id), eq(emailTemplates.workspaceId, workspace.id)))
    .limit(1);
  if (!template) notFound(); // built-in templates are copied via "Customize", never edited in place

  return (
    <Builder
      key={`${template.id}:${template.contentRevision}`}
      kind="template"
      id={template.id}
      name={template.name}
      initialDoc={{ blocks: template.blocks, theme: parseTheme(template.theme) }}
      initialRevision={template.contentRevision}
      backHref="/templates"
      doneHref="/templates"
      doneLabel="Done"
    />
  );
}
