import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { LayoutTemplate, Plus } from "lucide-react";
import { db } from "@/db/client";
import { landingPages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { createLandingPageAction } from "@/lib/actions/landing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function LandingPagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const pages = await db
    .select({ id: landingPages.id, name: landingPages.name, status: landingPages.status, updatedAt: landingPages.updatedAt })
    .from(landingPages)
    .where(eq(landingPages.workspaceId, workspace.id))
    .orderBy(desc(landingPages.updatedAt));

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Landing Pages</h1>
          <p className="mt-1 text-[13.5px] text-text-secondary">Standalone pages for campaigns and promotions, hosted for you. Add a signup form to turn visitors into subscribers.</p>
        </div>
        <form action={createLandingPageAction}>
          <Button type="submit"><Plus size={15} /> Create page</Button>
        </form>
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center rounded-[18px] border border-dashed border-border bg-surface px-6 py-16 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-surface text-primary"><LayoutTemplate size={22} /></span>
          <p className="text-[15px] font-semibold text-text-primary">No landing pages yet</p>
          <p className="mt-1 max-w-[440px] text-[13.5px] text-text-secondary">Start from a ready layout, edit it with the same drag-and-drop editor as your emails, then publish. You get a shareable link instantly.</p>
          <form action={createLandingPageAction} className="mt-5"><Button type="submit"><Plus size={15} /> Create your first page</Button></form>
        </div>
      ) : (
        <div className="grid gap-3">
          {pages.map((p) => (
            <Link key={p.id} href={`/landing-pages/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-surface px-5 py-4 transition-colors hover:bg-surface-secondary">
              <div>
                <p className="text-[14.5px] font-semibold text-text-primary">{p.name}</p>
                <p className="text-[12.5px] text-text-secondary">Edited {p.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <Badge tone={p.status === "PUBLISHED" ? "success" : "neutral"}>{p.status === "PUBLISHED" ? "Published" : "Draft"}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
