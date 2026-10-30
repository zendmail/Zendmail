import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { ArrowLeft, ExternalLink, Pause, Play, Trash2 } from "lucide-react";
import { db } from "@/db/client";
import { contacts, signupConfirmations, signupForms } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { embedSnippet, formPublicUrl } from "@/lib/signup-forms";
import { deleteSignupFormAction, setSignupFormStatusAction } from "@/lib/actions/signup-form-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormEditor } from "@/components/forms/form-editor";
import { CopyField } from "@/components/forms/copy-field";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [form] = await db.select().from(signupForms).where(and(eq(signupForms.id, id), eq(signupForms.workspaceId, workspace.id))).limit(1);
  if (!form) notFound();

  const [[subscribed], [pending]] = await Promise.all([
    db.select({ n: count() }).from(contacts).where(and(eq(contacts.workspaceId, workspace.id), eq(contacts.source, `form:${form.id}`), isNull(contacts.deletedAt))),
    db
      .select({ n: count() })
      .from(signupConfirmations)
      .where(and(eq(signupConfirmations.formId, form.id), isNull(signupConfirmations.confirmedAt), gt(signupConfirmations.expiresAt, new Date()))),
  ]);

  const url = formPublicUrl(form.publicId);
  const active = form.status === "ACTIVE";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Link href="/forms" className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary">
        <ArrowLeft size={14} /> Back to forms
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">{form.name}</h1>
          <Badge tone={active ? "success" : "warning"}>{active ? "Live" : "Paused"}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-border bg-surface px-4 text-sm font-semibold text-text-primary hover:bg-surface-secondary">
            <ExternalLink size={14} /> Open page
          </a>
          <form action={setSignupFormStatusAction}>
            <input type="hidden" name="formId" value={form.id} />
            <Button type="submit" variant="secondary">{active ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Make live</>}</Button>
          </form>
          <form action={deleteSignupFormAction}>
            <input type="hidden" name="formId" value={form.id} />
            <Button type="submit" variant="secondary" className="text-danger"><Trash2 size={14} /> Delete</Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent><p className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Subscribed</p><p className="mt-1 text-[28px] font-extrabold text-text-primary">{subscribed.n}</p></CardContent></Card>
        <Card><CardContent><p className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Waiting to confirm</p><p className="mt-1 text-[28px] font-extrabold text-text-primary">{pending.n}</p></CardContent></Card>
      </div>

      <FormEditor
        form={{
          id: form.id,
          publicId: form.publicId,
          name: form.name,
          title: form.title,
          description: form.description,
          buttonLabel: form.buttonLabel,
          successMessage: form.successMessage,
          collectName: form.collectName,
          consentText: form.consentText,
          doubleOptIn: form.doubleOptIn,
          accentColor: form.accentColor,
        }}
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Share this form</CardTitle>
            <CardDescription>Send people the link, or paste the embed code into your website, landing page or Shopify theme.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="Public link" value={url} />
          <CopyField label="Embed code (HTML)" value={embedSnippet(form.publicId, form.collectName ? 440 : 360)} multiline />
          {!active && <p className="text-[12.5px] text-warning">This form is paused, so visitors see an &ldquo;unavailable&rdquo; message until you make it live.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
