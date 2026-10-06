import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { MailCheck, ShieldCheck, UserRound } from "lucide-react";
import { db } from "@/db/client";
import { workspaceMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { listSendingDomains, MAX_DOMAINS_PER_WORKSPACE } from "@/lib/sending-domains/service";
import { domainProviderIsSimulated } from "@/lib/sending-domains/provider";
import { SendingDomainsPanel } from "@/components/workspace/sending-domains-panel";

const benefits = [
  { icon: MailCheck, title: "Your name in the inbox", text: "Customers see news@yourbrand.com instead of a Zendmail address." },
  { icon: ShieldCheck, title: "Better delivery", text: "Signing your emails (SPF and DKIM) tells Gmail and Outlook they're really from you." },
  { icon: UserRound, title: "Replies reach you", text: "Without a domain, campaigns still send, with replies going to your own email." },
];

export default async function SendingDomainsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, user.id)))
    .limit(1);

  const domains = await listSendingDomains(workspace.id);

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Sending domains</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          Send campaigns from your own business address, like hello@yourbrand.com.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {benefits.map((b) => (
          <div key={b.title} className="flex items-start gap-3 rounded-[14px] border border-border bg-surface p-4 sm:block">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary">
              <b.icon size={17} />
            </span>
            <div>
              <p className="text-[13.5px] font-bold text-text-primary sm:mt-3">{b.title}</p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-text-secondary">{b.text}</p>
            </div>
          </div>
        ))}
      </div>

      <SendingDomainsPanel
        domains={domains.map((d) => ({
          id: d.id,
          domain: d.domain,
          status: d.status,
          statusNote: d.statusNote,
          records: d.records,
          lastCheckedAt: d.lastCheckedAt?.toISOString() ?? null,
        }))}
        canManage={Boolean(member) && member.role !== "MEMBER"}
        simulated={domainProviderIsSimulated()}
        maxDomains={MAX_DOMAINS_PER_WORKSPACE}
      />
    </div>
  );
}
