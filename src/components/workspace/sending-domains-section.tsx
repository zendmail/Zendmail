"use client";

import { useActionState } from "react";
import { createSendingDomainAction, createSendingIdentityAction, verifySendingDomainAction } from "@/lib/actions/sending-domain-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { ErrorBanner, Field, Input, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function SendingDomainsSection({
  domains,
  identities,
}: {
  domains: Array<{ id: string; domain: string; status: string; dkimStatus?: string; spfStatus?: string; dmarcStatus?: string }>;
  identities: Array<{ id: string; name: string; fromEmail: string; replyTo?: string | null; status: string }>;
}) {
  const [domainState, domainAction, domainPending] = useActionState<ActionState, FormData>(createSendingDomainAction, undefined);
  const [verifyState, verifyAction, verifyPending] = useActionState<ActionState, FormData>(verifySendingDomainAction, undefined);
  const [identityState, identityAction, identityPending] = useActionState<ActionState, FormData>(createSendingIdentityAction, undefined);

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h3 className="text-lg font-semibold text-text-primary">Sending domains</h3>
        <p className="mt-1 text-sm text-text-secondary">Add your business domain, verify the DNS records, and then use it for authenticated sends.</p>

        <form action={domainAction} className="mt-4 space-y-4">
          <ErrorBanner message={domainState?.error} />
          <SuccessBanner message={domainState?.success} />
          <Field label="Domain" htmlFor="domain">
            <Input id="domain" name="domain" placeholder="learnwithahmed.com" required />
          </Field>
          <Button type="submit" variant="secondary" disabled={domainPending}>
            {domainPending ? "Saving…" : "Add domain"}
          </Button>
        </form>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h3 className="text-lg font-semibold text-text-primary">Verified domains</h3>
        <div className="mt-4 space-y-3">
          {domains.length === 0 ? (
            <p className="text-sm text-text-secondary">No domains configured yet.</p>
          ) : (
            domains.map((domain) => (
              <div key={domain.id} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface-secondary p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-text-primary">{domain.domain}</p>
                  <p className="text-xs text-text-secondary">
                    SPF: {domain.spfStatus ?? "PENDING"} • DKIM: {domain.dkimStatus ?? "PENDING"} • DMARC: {domain.dmarcStatus ?? "PENDING"}
                  </p>
                </div>
                <form action={verifyAction}>
                  <input type="hidden" name="domain" value={domain.domain} />
                  <Button type="submit" variant={domain.status === "VERIFIED" ? "ghost" : "secondary"} disabled={verifyPending}>
                    {domain.status === "VERIFIED" ? "Verified" : "Verify domain"}
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>
        <ErrorBanner message={verifyState?.error} />
        <SuccessBanner message={verifyState?.success} />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h3 className="text-lg font-semibold text-text-primary">Sending identities</h3>
        <p className="mt-1 text-sm text-text-secondary">Only verified domains can be used as sender identities.</p>

        <form action={identityAction} className="mt-4 space-y-4">
          <ErrorBanner message={identityState?.error} />
          <SuccessBanner message={identityState?.success} />

          <Field label="Display name" htmlFor="name">
            <Input id="name" name="name" placeholder="Learn With Ahmed" required />
          </Field>
          <Field label="From email" htmlFor="fromEmail">
            <Input id="fromEmail" name="fromEmail" placeholder="courses@learnwithahmed.com" required />
          </Field>
          <Field label="Reply-To" htmlFor="replyTo">
            <Input id="replyTo" name="replyTo" placeholder="support@learnwithahmed.com" />
          </Field>
          <Field label="Domain" htmlFor="domain">
            <select id="domain" name="domain" className="h-11 w-full rounded-[11px] border border-border bg-surface px-3.5 text-[15px] text-text-primary" defaultValue="" required>
              <option value="" disabled>Select a verified domain</option>
              {domains.filter((domain) => domain.status === "VERIFIED").map((domain) => (
                <option key={domain.id} value={domain.domain}>{domain.domain}</option>
              ))}
            </select>
          </Field>
          <Button type="submit" variant="secondary" disabled={identityPending}>
            {identityPending ? "Creating…" : "Create identity"}
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          {identities.length === 0 ? (
            <p className="text-sm text-text-secondary">No sender identities yet.</p>
          ) : (
            identities.map((identity) => (
              <div key={identity.id} className="rounded-[var(--radius-md)] border border-border bg-surface-secondary p-3">
                <p className="font-medium text-text-primary">{identity.name}</p>
                <p className="text-sm text-text-secondary">{identity.fromEmail}</p>
                {identity.replyTo ? <p className="text-xs text-text-secondary">Reply-To: {identity.replyTo}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
