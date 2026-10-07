"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, Copy, Globe, RefreshCw, Trash2 } from "lucide-react";
import {
  addSendingDomainAction,
  removeSendingDomainAction,
  verifySendingDomainAction,
} from "@/lib/actions/sending-domain-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type DomainView = {
  id: string;
  domain: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
  statusNote: string | null;
  records: {
    purpose: string;
    type: string;
    name: string;
    value: string;
    priority?: number | null;
    status?: string | null;
  }[];
  lastCheckedAt: string | null;
};

const statusBadge = {
  VERIFIED: { tone: "success", label: "Verified" },
  PENDING: { tone: "warning", label: "Waiting for DNS" },
  FAILED: { tone: "danger", label: "Failed" },
} as const;

const purposeLabel: Record<string, string> = {
  SPF: "SPF",
  DKIM: "DKIM",
  DMARC: "DMARC",
  RETURN_PATH: "Return path",
  TRACKING: "Link tracking",
  OTHER: "Other",
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — user can still select the text */
        }
      }}
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
}

function DomainCard({ domain, canManage }: { domain: DomainView; canManage: boolean }) {
  const [verifyState, verifyAction, verifying] = useActionState<ActionState, FormData>(verifySendingDomainAction, undefined);
  const [removeState, removeAction, removing] = useActionState<ActionState, FormData>(removeSendingDomainAction, undefined);
  const badge = statusBadge[domain.status];

  return (
    <div className="rounded-[16px] border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary">
            <Globe size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-text-primary">{domain.domain}</p>
            <p className="text-[12px] text-text-secondary">
              {domain.status === "VERIFIED"
                ? `Emails can be sent from any address @${domain.domain}`
                : "Add the DNS records below, then click Verify"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          {canManage && (
            <>
              {domain.status !== "VERIFIED" && (
                <form action={verifyAction}>
                  <input type="hidden" name="id" value={domain.id} />
                  <Button type="submit" size="sm" disabled={verifying}>
                    <RefreshCw size={14} className={verifying ? "animate-spin" : ""} />
                    {verifying ? "Checking…" : "Verify"}
                  </Button>
                </form>
              )}
              <form
                action={removeAction}
                onSubmit={(e) => {
                  if (!window.confirm(`Remove ${domain.domain}? Campaigns will no longer send from it.`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={domain.id} />
                <Button type="submit" size="sm" variant="ghost" disabled={removing} aria-label={`Remove ${domain.domain}`}>
                  <Trash2 size={14} />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <ErrorBanner message={verifyState?.error ?? removeState?.error} />
        <SuccessBanner message={verifyState?.success ?? removeState?.success} />
        {domain.statusNote && domain.status !== "VERIFIED" && !verifyState?.error && (
          <p className="rounded-[10px] bg-surface-secondary px-3 py-2 text-[12.5px] text-text-secondary">{domain.statusNote}</p>
        )}
      </div>

      {domain.records.length > 0 && domain.status !== "VERIFIED" && (
        <div className="mt-4">
          <p className="mb-2 text-[12.5px] font-semibold text-text-primary">DNS records to add at your domain host</p>
          <div className="overflow-x-auto rounded-[12px] border border-border">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead className="bg-surface-secondary text-[11px] uppercase tracking-[0.06em] text-text-tertiary">
                <tr>
                  <th className="px-3 py-2 font-semibold">Purpose</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Name / Host</th>
                  <th className="px-3 py-2 font-semibold">Value</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {domain.records.map((r, i) => (
                  <tr key={`${r.name}-${i}`} className="border-t border-border align-top">
                    <td className="px-3 py-2.5 font-medium text-text-primary">{purposeLabel[r.purpose] ?? r.purpose}</td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {r.type}
                      {r.priority != null && <span className="block text-[11px] text-text-tertiary">priority {r.priority}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-start gap-1">
                        <code className="break-all font-mono text-[12px] text-text-primary">{r.name}</code>
                        <CopyButton value={r.name} label="name" />
                      </span>
                    </td>
                    <td className="max-w-[320px] px-3 py-2.5">
                      <span className="flex items-start gap-1">
                        <code className="break-all font-mono text-[12px] text-text-primary">{r.value}</code>
                        <CopyButton value={r.value} label="value" />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] capitalize text-text-secondary">
                      {r.status ? r.status.replace(/_/g, " ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] leading-[1.5] text-text-tertiary">
            Add these at the company where you bought your domain (GoDaddy, Namecheap, Cloudflare, Google Domains…). Some hosts
            add <strong>.{domain.domain}</strong> to the name automatically — if so, enter only the part before it. DNS changes can
            take from a few minutes to 24 hours.
          </p>
        </div>
      )}
    </div>
  );
}

export function SendingDomainsPanel({
  domains,
  canManage,
  simulated,
  maxDomains,
}: {
  domains: DomainView[];
  canManage: boolean;
  simulated: boolean;
  maxDomains: number;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addSendingDomainAction, undefined);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-5">
      {simulated && (
        <p className="rounded-[12px] border border-warning/30 bg-warning-surface px-4 py-3 text-[12.5px] leading-[1.5] text-warning">
          <strong>Development mode.</strong> No email provider key is set on this server, so domains are simulated: example DNS
          records are shown and clicking Verify marks the domain verified. Set <code>EMAIL_PROVIDER_API_KEY</code> to use real domains.
        </p>
      )}

      {canManage ? (
        <form ref={formRef} action={formAction} className="rounded-[16px] border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
          <label htmlFor="domain" className="text-[14px] font-bold text-text-primary">
            Add a sending domain
          </label>
          <p className="mt-1 text-[12.5px] text-text-secondary">
            The domain you want your emails to come from — the part after the @ in your business email.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="domain"
              name="domain"
              type="text"
              inputMode="url"
              autoComplete="off"
              placeholder="yourbrand.com"
              required
              disabled={domains.length >= maxDomains}
              className="h-10 min-w-0 flex-1 rounded-[12px] border border-border bg-surface px-3.5 text-[14px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary/50 focus:shadow-[var(--shadow-focus-primary)] disabled:opacity-60"
            />
            <Button type="submit" size="lg" disabled={pending || domains.length >= maxDomains}>
              {pending ? "Adding…" : "Add domain"}
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            <ErrorBanner message={state?.error} />
            <SuccessBanner message={state?.success} />
            {domains.length >= maxDomains && (
              <p className="text-[12.5px] text-text-secondary">You&apos;ve reached the limit of {maxDomains} domains.</p>
            )}
          </div>
        </form>
      ) : (
        <p className="rounded-[12px] bg-surface-secondary px-4 py-3 text-[13px] text-text-secondary">
          Only the workspace owner or an admin can add or remove sending domains.
        </p>
      )}

      {domains.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border px-6 py-10 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-surface text-primary">
            <Globe size={19} />
          </span>
          <p className="mt-3 text-[14.5px] font-bold text-text-primary">No sending domain yet</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-[1.55] text-text-secondary">
            Until you verify one, campaigns are sent from Zendmail&apos;s shared address with your business name, and replies come
            to your email.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((d) => (
            <DomainCard key={d.id} domain={d} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}
