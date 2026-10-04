"use client";

import { useActionState, useState } from "react";
import {
  addSendingDomainAction,
  verifySendingDomainAction,
  removeSendingDomainAction,
  createSendingIdentityAction,
  deleteSendingIdentityAction,
  sendDomainTestEmailAction,
} from "@/lib/actions/sending-actions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

const inputClass =
  "h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-[13.5px] text-text-primary outline-none focus:border-primary";

function useAction(action: (prev: ActionState, fd: FormData) => Promise<ActionState>) {
  return useActionState<ActionState, FormData>(action, undefined);
}

export function AddDomainForm() {
  const [state, formAction, pending] = useAction(addSendingDomainAction);
  return (
    <form action={formAction} className="space-y-3">
      <ErrorBanner message={state?.error} />
      <label className="block text-[13px] font-medium text-text-primary" htmlFor="domain">
        Your domain
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="domain" name="domain" placeholder="learnwithahmed.com" required autoComplete="off" className={inputClass} />
        <Button type="submit" disabled={pending} className="sm:w-auto">
          {pending ? "Adding…" : "Add domain"}
        </Button>
      </div>
      <p className="text-[12.5px] text-text-secondary">You&apos;ll publish a few DNS records to prove you own it. Nothing is sent until they pass.</p>
    </form>
  );
}

export function VerifyDomainButton({ domainId }: { domainId: string }) {
  const [state, formAction, pending] = useAction(verifySendingDomainAction);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="domainId" value={domainId} />
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Checking DNS…" : "Verify DNS"}
      </Button>
    </form>
  );
}

export function CreateIdentityForm({ domainId, domain }: { domainId: string; domain: string }) {
  const [state, formAction, pending] = useAction(createSendingIdentityAction);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="domainId" value={domainId} />
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <input name="fromName" placeholder="Sender name, e.g. Learn With Ahmed" required className={inputClass} />
      <div className="flex items-center gap-2">
        <input name="localPart" placeholder="courses" required className={inputClass} aria-label="Address before the @" />
        <span className="shrink-0 text-[13.5px] text-text-secondary">@{domain}</span>
      </div>
      <input name="replyTo" type="email" placeholder="Reply-To (optional), e.g. support@yourdomain.com" className={inputClass} />
      <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Creating…" : "Create identity"}
      </Button>
    </form>
  );
}

export function DeleteIdentityButton({ identityId }: { identityId: string }) {
  const [state, formAction, pending] = useAction(deleteSendingIdentityAction);
  return (
    <form action={formAction}>
      <input type="hidden" name="identityId" value={identityId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-label="Remove identity">
        Remove
      </Button>
      {state?.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function RemoveDomainButton({ domainId }: { domainId: string }) {
  const [state, formAction, pending] = useAction(removeSendingDomainAction);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="domainId" value={domainId} />
      <ErrorBanner message={state?.error} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        Remove domain
      </Button>
    </form>
  );
}

export function TestEmailForm({ identities }: { identities: { id: string; fromEmail: string }[] }) {
  const [state, formAction, pending] = useAction(sendDomainTestEmailAction);
  return (
    <form action={formAction} className="space-y-3">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <select name="identityId" required className={inputClass} defaultValue={identities[0]?.id}>
        {identities.map((i) => (
          <option key={i.id} value={i.id}>
            {i.fromEmail}
          </option>
        ))}
      </select>
      <p className="text-[12.5px] text-text-secondary">The test goes to your own account email only.</p>
      <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send test email"}
      </Button>
    </form>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — the value is still visible to select manually */
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
