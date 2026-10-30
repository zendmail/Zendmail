import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { workspaces } from "@/db/schema";
import { getPublicForm } from "@/lib/signup-forms";
import { PublicSignupForm } from "@/components/forms/public-signup-form";

export const metadata: Metadata = { title: "Subscribe", robots: { index: false, follow: false } };

export default async function PublicSignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { publicId } = await params;
  const { embed } = await searchParams;
  const embedded = embed === "1";
  const form = await getPublicForm(publicId);
  const [workspace] = form
    ? await db.select({ name: workspaces.name, logoUrl: workspaces.logoUrl }).from(workspaces).where(eq(workspaces.id, form.workspaceId)).limit(1)
    : [];

  const card = (children: React.ReactNode) =>
    embedded ? (
      <div className="mx-auto w-full max-w-[460px] p-1">{children}</div>
    ) : (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-[460px] rounded-[18px] border border-border bg-surface p-7 shadow-[0_8px_30px_rgba(16,21,28,0.06)]">
          {workspace?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspace.logoUrl} alt={workspace.name} className="mb-5 h-9 w-auto max-w-[160px] object-contain" />
          )}
          {children}
          <p className="mt-5 text-center text-[11.5px] text-text-tertiary">Your email is only used by {workspace?.name ?? "this business"}. Unsubscribe any time.</p>
        </div>
      </div>
    );

  if (!form || !workspace || form.status !== "ACTIVE") {
    return card(
      <div className="py-6 text-center">
        <p className="text-[16px] font-semibold text-text-primary">This signup form is not available</p>
        <p className="mt-1 text-[13.5px] text-text-secondary">It may have been paused or removed by its owner.</p>
      </div>
    );
  }

  return card(
    <PublicSignupForm
      publicId={form.publicId}
      title={form.title}
      description={form.description}
      buttonLabel={form.buttonLabel}
      collectName={form.collectName}
      consentText={form.consentText}
      accentColor={form.accentColor}
    />
  );
}
