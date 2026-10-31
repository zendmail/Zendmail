import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { landingPages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { parseTheme } from "@/lib/email-builder/theme";
import { Builder } from "@/components/builder/builder";

export default async function LandingEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [page] = await db.select().from(landingPages).where(and(eq(landingPages.id, id), eq(landingPages.workspaceId, workspace.id))).limit(1);
  if (!page) notFound();

  return (
    <Builder
      key={`${page.id}:${page.contentRevision}`}
      kind="landing"
      id={page.id}
      name={page.name}
      initialDoc={{ blocks: page.blocks, theme: parseTheme(page.theme) }}
      initialRevision={page.contentRevision}
      backHref={`/landing-pages/${page.id}`}
      doneHref={`/landing-pages/${page.id}`}
      doneLabel="Done"
    />
  );
}
