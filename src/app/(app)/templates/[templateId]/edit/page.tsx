import { notFound, redirect } from "next/navigation";
import { and, eq, isNull, or } from "drizzle-orm";
import { TemplateBuilder } from "@/components/templates/template-builder";
import { db } from "@/db/client";
import { emailTemplates } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";

export default async function EditTemplatePage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, templateId), or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id))))
    .limit(1);

  if (!template) notFound();

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-[1480px]">
        <h1 className="text-[30px] font-bold tracking-[-0.03em] text-text-primary">Email builder</h1>
        <p className="mt-1 text-[15px] text-text-secondary">Create clear, branded emails that look great on every screen.</p>
      </div>
      <TemplateBuilder template={template} />
    </div>
  );
}
