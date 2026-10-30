import Link from "next/link";
import { redirect } from "next/navigation";
import { count, desc, eq, and, isNull } from "drizzle-orm";
import { FileText, Plus } from "lucide-react";
import { db } from "@/db/client";
import { contacts, signupForms } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { createSignupFormAction } from "@/lib/actions/signup-form-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function FormsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const forms = await db.select().from(signupForms).where(eq(signupForms.workspaceId, workspace.id)).orderBy(desc(signupForms.createdAt));
  const subscribed = await Promise.all(
    forms.map(async (f) => {
      const [row] = await db.select({ n: count() }).from(contacts).where(and(eq(contacts.workspaceId, workspace.id), eq(contacts.source, `form:${f.id}`), isNull(contacts.deletedAt)));
      return row.n;
    })
  );

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Forms</h1>
          <p className="mt-1 text-[13.5px] text-text-secondary">Signup forms that grow your list with proper consent. New subscribers get your Welcome flow automatically.</p>
        </div>
        <form action={createSignupFormAction}>
          <Button type="submit"><Plus size={15} /> Create form</Button>
        </form>
      </div>

      {forms.length === 0 ? (
        <div className="flex flex-col items-center rounded-[18px] border border-dashed border-border bg-surface px-6 py-16 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-surface text-primary"><FileText size={22} /></span>
          <p className="text-[15px] font-semibold text-text-primary">No signup forms yet</p>
          <p className="mt-1 max-w-[420px] text-[13.5px] text-text-secondary">Create a form, share its link or embed it on your website. People confirm their email, then your Welcome automation starts.</p>
          <form action={createSignupFormAction} className="mt-5"><Button type="submit"><Plus size={15} /> Create your first form</Button></form>
        </div>
      ) : (
        <div className="grid gap-3">
          {forms.map((f, i) => (
            <Link key={f.id} href={`/forms/${f.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-surface px-5 py-4 transition-colors hover:bg-surface-secondary">
              <div className="flex items-center gap-3">
                <span className="h-9 w-1.5 rounded-full" style={{ backgroundColor: f.accentColor }} />
                <div>
                  <p className="text-[14.5px] font-semibold text-text-primary">{f.name}</p>
                  <p className="text-[12.5px] text-text-secondary">{f.doubleOptIn ? "Double opt-in" : "Single opt-in"} · {subscribed[i]} subscribed</p>
                </div>
              </div>
              <Badge tone={f.status === "ACTIVE" ? "success" : "warning"}>{f.status === "ACTIVE" ? "Live" : "Paused"}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
