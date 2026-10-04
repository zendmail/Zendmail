import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddDomainForm } from "@/components/sending/sending-forms";
import { AuthStatusBadge, DmarcBadge } from "@/components/sending/status-badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { listSendingDomains, listIdentities } from "@/lib/sending/domains";
import { isDomainSendable } from "@/lib/sending/rules";
import { emailProvider } from "@/lib/email-provider";

export default async function SendingDomainsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [domains, identities] = await Promise.all([listSendingDomains(workspace.id), listIdentities(workspace.id)]);

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Sending Domains</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Send campaigns from your own authenticated domain instead of a shared one.</p>
      </div>

      {!emailProvider.live ? (
        <Card>
          <CardContent>
            <p className="text-[13.5px] text-text-secondary">
              <strong className="text-text-primary">No email provider is connected.</strong> Domain verification needs a provider API key
              (<code>EMAIL_PROVIDER_API_KEY</code>) on the server. Until then, domains can&apos;t be added and mail isn&apos;t delivered.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add a domain</CardTitle>
        </CardHeader>
        <CardContent>
          <AddDomainForm />
        </CardContent>
      </Card>

      {domains.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Globe className="size-6 text-text-secondary" aria-hidden />
              <p className="text-[14px] font-semibold text-text-primary">No sending domains yet</p>
              <p className="max-w-sm text-[13px] text-text-secondary">
                Add your business domain to send as your brand. Until then, campaigns can only go out from the Zendmail-managed sender.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => {
            const ready = isDomainSendable(d);
            const count = identities.filter((i) => i.identity.domainId === d.id).length;
            return (
              <Link key={d.id} href={`/workspace/sending-domains/${d.id}`} className="block">
                <Card className="transition-colors hover:border-border-strong">
                  <CardContent>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-text-primary">{d.domain}</p>
                        <p className="mt-0.5 text-[12.5px] text-text-secondary">
                          {count} sending {count === 1 ? "identity" : "identities"}
                          {d.lastCheckedAt ? ` · checked ${d.lastCheckedAt.toLocaleDateString()}` : " · never checked"}
                        </p>
                      </div>
                      <Badge tone={ready ? "success" : "warning"}>{ready ? "✓ Ready" : "Setup incomplete"}</Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px] sm:grid-cols-4">
                      <Row label="Ownership" value={<AuthStatusBadge status={d.ownershipStatus} />} />
                      <Row label="DKIM" value={<AuthStatusBadge status={d.dkimStatus} />} />
                      <Row label="SPF" value={<AuthStatusBadge status={d.spfStatus} />} />
                      <Row label="DMARC" value={<DmarcBadge status={d.dmarcStatus} policy={d.dmarcPolicy} />} />
                    </dl>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-text-secondary">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
