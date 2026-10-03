import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  VerifyDomainButton,
  CreateIdentityForm,
  DeleteIdentityButton,
  RemoveDomainButton,
  TestEmailForm,
  CopyButton,
} from "@/components/sending/sending-forms";
import { AuthStatusBadge, DmarcBadge } from "@/components/sending/status-badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getSendingDomain, listIdentities } from "@/lib/sending/domains";
import { isDomainSendable } from "@/lib/sending/rules";

const PURPOSE_LABEL = {
  OWNERSHIP: "Proves you own the domain",
  DKIM: "DKIM — signs your mail",
  SPF: "SPF — authorizes the sending service",
  RETURN_PATH: "Custom bounce (MAIL FROM) domain",
} as const;

export default async function SendingDomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  // Scoped by workspace: another workspace's domain id is indistinguishable from a missing one.
  const domain = await getSendingDomain(workspace.id, id);
  if (!domain) notFound();

  const identities = (await listIdentities(workspace.id)).filter((r) => r.identity.domainId === domain.id);
  const ready = isDomainSendable(domain);

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <div>
        <Link href="/workspace/sending-domains" className="text-[12.5px] text-text-secondary hover:text-text-primary">
          ← Sending Domains
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="break-all text-[22px] font-extrabold tracking-[-0.025em] text-text-primary">{domain.domain}</h1>
          <Badge tone={ready ? "success" : "warning"}>{ready ? "✓ Ready to send" : "Setup incomplete"}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            {domain.lastCheckedAt ? `Last checked ${domain.lastCheckedAt.toLocaleString()}` : "Not checked yet — publish the records below, then verify."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12.5px] sm:grid-cols-3">
            <Item label="Ownership"><AuthStatusBadge status={domain.ownershipStatus} /></Item>
            <Item label="DKIM"><AuthStatusBadge status={domain.dkimStatus} /></Item>
            <Item label="SPF"><AuthStatusBadge status={domain.spfStatus} /></Item>
            <Item label="Bounce domain"><AuthStatusBadge status={domain.returnPathStatus} /></Item>
            <Item label="DMARC"><DmarcBadge status={domain.dmarcStatus} policy={domain.dmarcPolicy} /></Item>
            <Item label="Sending"><Badge tone={ready ? "success" : "neutral"}>{ready ? "✓ Ready" : "Not ready"}</Badge></Item>
          </dl>
          {domain.dmarcStatus === "FAILING" ? (
            <p className="mt-3 text-[12.5px] text-text-secondary">
              DMARC is recommended, not required. Add a TXT record at <code>_dmarc.{domain.domain}</code> such as{" "}
              <code className="break-all">v=DMARC1; p=none; rua=mailto:you@{domain.domain}</code>.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1 · Publish these DNS records</CardTitle>
          <CardDescription>
            Add each record at your DNS provider (Cloudflare, GoDaddy, Namecheap, Route 53…). Zendmail doesn&apos;t change your DNS for you. Some
            providers append the domain automatically — if so, enter only the Host shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {domain.dnsRecords.map((r, i) => (
            <div key={i} className="rounded-[var(--radius-sm)] border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-text-primary">{PURPOSE_LABEL[r.purpose]}</p>
                <AuthStatusBadge status={r.status} />
              </div>
              <dl className="mt-2 space-y-2 text-[12.5px]">
                <Field label="Type" value={r.type} />
                <Field label="Host" value={r.host} copy />
                <Field label="Value" value={r.value} copy />
                {typeof r.priority === "number" ? <Field label="Priority" value={String(r.priority)} /> : null}
              </dl>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2 · Verify DNS</CardTitle>
          <CardDescription>DNS changes can take minutes to hours. Re-run this until every record passes.</CardDescription>
        </CardHeader>
        <CardContent>
          {domain.lastError ? <p className="mb-3 text-[12.5px] text-danger">{domain.lastError}</p> : null}
          <VerifyDomainButton domainId={domain.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3 · Sending identities</CardTitle>
          <CardDescription>The From / Reply-To addresses campaigns can use. Available once the domain is verified.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {identities.length === 0 ? (
            <p className="text-[13px] text-text-secondary">No identities on this domain yet.</p>
          ) : (
            <ul className="space-y-2">
              {identities.map(({ identity }) => (
                <li key={identity.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border p-3">
                  <div className="min-w-0 text-[13px]">
                    <p className="truncate font-medium text-text-primary">
                      {identity.fromName} {identity.isDefault ? <Badge tone="primary">Default</Badge> : null}
                    </p>
                    <p className="truncate text-text-secondary">{identity.fromEmail}</p>
                    {identity.replyTo ? <p className="truncate text-text-secondary">Replies → {identity.replyTo}</p> : null}
                  </div>
                  <DeleteIdentityButton identityId={identity.id} />
                </li>
              ))}
            </ul>
          )}
          {ready ? (
            <CreateIdentityForm domainId={domain.id} domain={domain.domain} />
          ) : (
            <p className="text-[12.5px] text-text-secondary">Verify the domain first — identities can&apos;t be created on an unverified domain.</p>
          )}
        </CardContent>
      </Card>

      {ready && identities.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>4 · Send a test email</CardTitle>
            {domain.testEmailSentAt ? <CardDescription>Last test handed to the provider {domain.testEmailSentAt.toLocaleString()}.</CardDescription> : null}
          </CardHeader>
          <CardContent>
            <TestEmailForm identities={identities.map((r) => ({ id: r.identity.id, fromEmail: r.identity.fromEmail }))} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Remove domain</CardTitle>
          <CardDescription>Remove its identities first. This also deletes the domain from the email provider.</CardDescription>
        </CardHeader>
        <CardContent>
          <RemoveDomainButton domainId={domain.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-text-secondary">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Field({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="w-14 shrink-0 text-text-secondary">{label}</dt>
      <dd className="min-w-0 flex-1 break-all font-mono text-text-primary">{value}</dd>
      {copy ? <CopyButton value={value} /> : null}
    </div>
  );
}
