import { redirect } from "next/navigation";
import { Bot, ShieldCheck, Sparkles } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { autopilotProposals } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { buildPlan } from "@/lib/autopilot/playbook";
import { loadStoreProfile } from "@/lib/autopilot/profile-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProposalCard } from "@/components/autopilot/proposal-card";
import { generateAutopilotPlanAction } from "@/lib/actions/autopilot-actions";

const KIND_LABEL = { PHYSICAL: "Physical products store", DIGITAL: "Digital products", SERVICE: "Software, services or memberships", CONTENT: "Newsletter or content business", MIXED: "Mixed (physical and digital)" } as const;
const BASIS_LABEL = { STORE: "from your connected store", CATALOG: "from your product catalogue", ONBOARDING: "from your setup answers", DEFAULT: "a default until more data is available" } as const;

export default async function AutopilotPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const profile = await loadStoreProfile(workspace.id);
  const plan = buildPlan(profile);
  const proposals = await db
    .select()
    .from(autopilotProposals)
    .where(and(eq(autopilotProposals.workspaceId, workspace.id), eq(autopilotProposals.status, "PROPOSED")))
    .orderBy(asc(autopilotProposals.createdAt));
  const aiOn = !!process.env.AI_PROVIDER_API_KEY;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.025em] text-text-primary"><Bot size={22} className="text-primary" /> Autopilot</h1>
          <p className="mt-1 max-w-[640px] text-[13.5px] text-text-secondary">Autopilot studies your store, works out which emails will win back and attract customers, who should get each one, and prepares them with your real products and photos. You review and approve every email.</p>
        </div>
        <form action={generateAutopilotPlanAction}>
          <Button type="submit"><Sparkles size={15} /> {proposals.length ? "Refresh my plan" : "Create my plan"}</Button>
        </form>
      </div>

      {error === "rate" && <p role="alert" className="rounded-[10px] bg-warning-surface px-4 py-3 text-[13px] text-warning">You have refreshed the plan a few times already. Please try again in an hour.</p>}

      <section className="rounded-[18px] border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-bold text-text-primary">What we found</h2>
          <Badge tone={profile.confidence === "HIGH" ? "success" : "primary"}>{profile.confidence === "HIGH" ? "High confidence" : profile.confidence === "MEDIUM" ? "Medium confidence" : "Low confidence"}</Badge>
        </div>
        <p className="mt-2 text-[14px] text-text-primary"><strong>{KIND_LABEL[profile.kind]}</strong> <span className="text-text-secondary">({BASIS_LABEL[profile.basis]})</span></p>
        <ul className="mt-3 grid gap-1.5 text-[13px] text-text-secondary sm:grid-cols-2">
          {profile.signals.map((s) => (<li key={s} className="flex gap-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />{s}</li>))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-text-tertiary"><ShieldCheck size={14} /> Nothing is sent automatically. {aiOn ? "Copy is written by AI and checked so it never invents discounts or claims." : "Copy uses safe built-in wording (AI writing is not enabled yet)."}</p>
      </section>

      {proposals.length === 0 ? (
        <section className="rounded-[18px] border border-dashed border-border-strong bg-surface p-8 text-center">
          <h2 className="text-[16px] font-bold text-text-primary">Your plan is ready to be created</h2>
          <p className="mx-auto mt-1 max-w-[520px] text-[13.5px] text-text-secondary">Based on what we found, Autopilot would prepare {plan.items.length} email{plan.items.length === 1 ? "" : "s"}: {plan.items.slice(0, 3).map((i) => i.title.toLowerCase()).join(", ")}{plan.items.length > 3 ? " and more" : ""}.</p>
        </section>
      ) : (
        <ul className="space-y-5">
          {proposals.map((p) => {
            return <ProposalCard key={p.id} proposal={p} />;
          })}
        </ul>
      )}

      {plan.recommendations.length > 0 && (
        <section className="rounded-[18px] border border-border bg-surface-secondary/50 p-5">
          <h2 className="text-[15px] font-bold text-text-primary">Coming next for your store</h2>
          <ul className="mt-3 space-y-3">
            {plan.recommendations.map((r) => (<li key={r.key}><p className="text-[13.5px] font-semibold text-text-primary">{r.title}</p><p className="text-[13px] text-text-secondary">{r.why}</p></li>))}
          </ul>
        </section>
      )}
    </div>
  );
}
