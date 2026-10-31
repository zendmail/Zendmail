import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, Copy, ExternalLink, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { db } from "@/db/client";
import { landingPages, signupForms } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { landingPublicUrl } from "@/lib/landing-pages";
import { deleteLandingPageAction, duplicateLandingPageAction, setLandingStatusAction } from "@/lib/actions/landing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/forms/copy-field";
import { LandingSettings } from "@/components/landing/landing-settings";
import { senderInTestMode } from "@/lib/email";
import { TestModeNotice } from "@/components/sending/test-mode-notice";

export default async function LandingPageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [page] = await db.select().from(landingPages).where(and(eq(landingPages.id, id), eq(landingPages.workspaceId, workspace.id))).limit(1);
  if (!page) notFound();
  const forms = await db.select({ id: signupForms.id, name: signupForms.name, status: signupForms.status }).from(signupForms).where(eq(signupForms.workspaceId, workspace.id)).orderBy(desc(signupForms.createdAt));

  const url = landingPublicUrl(page.publicId);
  const live = page.status === "PUBLISHED";
  const attached = forms.find((f) => f.id === page.formId);

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <Link href="/landing-pages" className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary">
        <ArrowLeft size={14} /> Back to landing pages
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">{page.name}</h1>
          <Badge tone={live ? "success" : "neutral"}>{live ? "Published" : "Draft"}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/landing-pages/${page.id}/editor`} className="inline-flex h-9 items-center gap-2 rounded-[12px] bg-primary px-4 text-sm font-semibold text-primary-text-on hover:bg-primary-hover">
            <Pencil size={14} /> Edit design
          </Link>
          {live && (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-border bg-surface px-4 text-sm font-semibold text-text-primary hover:bg-surface-secondary">
              <ExternalLink size={14} /> View live
            </a>
          )}
          <form action={setLandingStatusAction}>
            <input type="hidden" name="pageId" value={page.id} />
            <Button type="submit" variant="secondary">{live ? <><EyeOff size={14} /> Unpublish</> : <><Eye size={14} /> Publish</>}</Button>
          </form>
          <form action={duplicateLandingPageAction}>
            <input type="hidden" name="pageId" value={page.id} />
            <Button type="submit" variant="secondary"><Copy size={14} /> Duplicate</Button>
          </form>
          <form action={deleteLandingPageAction}>
            <input type="hidden" name="pageId" value={page.id} />
            <Button type="submit" variant="secondary" className="text-danger"><Trash2 size={14} /> Delete</Button>
          </form>
        </div>
      </div>

      {senderInTestMode && page.formId && <TestModeNotice />}
      {!live && <p className="rounded-[12px] bg-warning-surface px-4 py-3 text-[13px] text-warning">This page is a draft. Visitors can&apos;t see it until you publish.</p>}
      {live && page.formId && attached?.status === "PAUSED" && <p className="rounded-[12px] bg-warning-surface px-4 py-3 text-[13px] text-warning">The attached signup form is paused, so it is hidden on this page. Make it live in Forms.</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Card>
          <CardHeader><CardTitle>Page settings</CardTitle></CardHeader>
          <CardContent><LandingSettings page={{ id: page.id, name: page.name, seoTitle: page.seoTitle, seoDescription: page.seoDescription, formId: page.formId }} forms={forms} /></CardContent>
        </Card>
        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Share</CardTitle>
              <CardDescription>Hosted on your Zendmail address, so no domain is needed. Put this link in emails, social bios or ads.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyField label="Public link" value={url} />
            <p className="text-[12.5px] text-text-secondary">Later, when you own a domain, you can point it at your pages.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
