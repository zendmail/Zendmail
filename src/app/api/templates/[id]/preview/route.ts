import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { emailTemplates } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { renderEmailHtml } from "@/lib/email-builder/render";
import { SAMPLE_VARS } from "@/lib/email-builder/merge";

/** Returns the rendered HTML of a template (built-in or the caller's own) for the gallery's live previews. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) return Response.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found" }, { status: 404 });

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.id, id), or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id))))
    .limit(1);
  if (!template) return Response.json({ error: "Not found" }, { status: 404 });

  const html = renderEmailHtml(template.blocks, {
    theme: template.theme,
    preheader: template.previewText,
    vars: { ...SAMPLE_VARS, business_name: workspace.name },
  });
  return Response.json({ html }, { headers: { "Cache-Control": "private, max-age=120" } });
}
