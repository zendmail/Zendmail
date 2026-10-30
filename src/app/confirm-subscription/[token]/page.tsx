import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { MailCheck, MailWarning } from "lucide-react";
import { db } from "@/db/client";
import { workspaces } from "@/db/schema";
import { findPendingConfirmation } from "@/lib/signup-forms";
import { confirmSubscriptionAction } from "@/lib/actions/signup-confirm-actions";

export const metadata: Metadata = { title: "Confirm your subscription", robots: { index: false, follow: false } };

const messages: Record<string, { ok: boolean; title: string; body: string }> = {
  confirmed: { ok: true, title: "You're subscribed", body: "Thanks for confirming. Your welcome email is on its way." },
  already: { ok: true, title: "Already confirmed", body: "This subscription is already active. Nothing more to do." },
  expired: { ok: false, title: "This link has expired", body: "Please sign up again from the form to get a new confirmation email." },
  blocked: { ok: false, title: "We couldn't subscribe this address", body: "This address was unsubscribed earlier. Please contact the sender if you'd like to rejoin." },
  invalid: { ok: false, title: "This link isn't valid", body: "It may have been copied incorrectly. Please sign up again from the form." },
};

const isExpired = (date: Date) => date.getTime() < Date.now();

export default async function ConfirmSubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);
  const { result } = await searchParams;

  let view = result ? messages[result] : undefined;
  let businessName = "this business";

  const pending = await findPendingConfirmation(token);
  if (pending) {
    const [workspace] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, pending.workspaceId)).limit(1);
    if (workspace) businessName = workspace.name;
  }
  if (!view && !pending) view = messages.invalid;
  if (!view && pending?.confirmedAt) view = messages.already;
  if (!view && pending && isExpired(pending.expiresAt)) view = messages.expired;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[440px] rounded-[18px] border border-border bg-surface p-8 text-center shadow-[0_8px_30px_rgba(16,21,28,0.06)]">
        {view ? (
          <>
            <span className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${view.ok ? "bg-success-surface text-success" : "bg-warning-surface text-warning"}`}>
              {view.ok ? <MailCheck size={22} /> : <MailWarning size={22} />}
            </span>
            <h1 className="text-[19px] font-extrabold text-text-primary">{view.title}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{view.body}</p>
          </>
        ) : (
          <>
            <h1 className="text-[19px] font-extrabold text-text-primary">Confirm your subscription</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
              Press the button to confirm you want to receive emails from <strong>{businessName}</strong>.
            </p>
            <form action={confirmSubscriptionAction} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="h-11 w-full rounded-[11px] bg-primary text-[14.5px] font-semibold text-white hover:bg-primary-hover">
                Confirm subscription
              </button>
            </form>
            <p className="mt-4 text-[12px] text-text-tertiary">If you didn&apos;t ask for this, just close this page. Nothing will happen.</p>
          </>
        )}
      </div>
    </div>
  );
}
