// Pure functions only (no DB, no env, no network) so every authorization and
// authentication decision can be unit-tested without infrastructure.

export type CheckStatus = "NOT_CHECKED" | "PENDING" | "PASSING" | "FAILING";

export type DomainAuthState = {
  ownershipStatus: CheckStatus;
  dkimStatus: CheckStatus;
  spfStatus: CheckStatus;
  returnPathStatus: CheckStatus;
};

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const EMAIL_RE = /^[a-z0-9._%+-]{1,64}@([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Domains that can never be claimed as a workspace's own sending domain. */
const BLOCKED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zendmail.demo",
]);

/** Lower-cases and strips scheme/path/whitespace. Returns null when the result isn't a plausible domain. */
export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  value = value.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "");
  value = value.split(/[/?#]/)[0] ?? "";
  value = value.replace(/\.$/, "");
  if (!DOMAIN_RE.test(value)) return null;
  if (BLOCKED_DOMAINS.has(value)) return null;
  return value;
}

export function normalizeEmail(input: string): string | null {
  const value = input.trim().toLowerCase();
  return EMAIL_RE.test(value) ? value : null;
}

export function domainOfEmail(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

/**
 * A domain may send only when ownership, DKIM and SPF have actually passed (and the
 * return-path record, if the provider uses one, is not failing). DMARC
 * is deliberately not required — it is a recommendation, not a gate.
 */
export function isDomainSendable(state: DomainAuthState): boolean {
  // The return-path (custom MAIL FROM) record exists only for providers that use one; when it
  // does exist and isn't passing, the provider will refuse the domain, so we refuse it too.
  const returnPathOk = state.returnPathStatus !== "FAILING" && state.returnPathStatus !== "PENDING";
  return state.ownershipStatus === "PASSING" && state.dkimStatus === "PASSING" && state.spfStatus === "PASSING" && returnPathOk;
}

export type SenderCandidateIdentity = {
  id: string;
  workspaceId: string;
  domainId: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  domain: { id: string; workspaceId: string; domain: string } & DomainAuthState;
};

export type SenderDecision =
  | { ok: true; mode: "WORKSPACE_DOMAIN"; identity: SenderCandidateIdentity }
  | { ok: true; mode: "ZENDMAIL_MANAGED" }
  | { ok: false; code: "NO_IDENTITY" | "DOMAIN_NOT_VERIFIED" | "INVALID_ADDRESS"; reason: string; resolution: string };

/**
 * Decides how a message with the requested From address may be sent.
 *
 *  1. A workspace identity on a fully authenticated domain  -> send as that identity.
 *  2. An address on a Zendmail-managed domain               -> send via the platform sender.
 *  3. Anything else                                         -> refused, with the exact reason.
 *
 * Identities from other workspaces are ignored even if the address matches,
 * so a sender can never be borrowed across tenants.
 */
export function decideSender(input: {
  workspaceId: string;
  fromEmail: string;
  identities: SenderCandidateIdentity[];
  managedDomains: string[];
}): SenderDecision {
  const email = normalizeEmail(input.fromEmail);
  if (!email) {
    return {
      ok: false,
      code: "INVALID_ADDRESS",
      reason: "The From address isn't a valid email address.",
      resolution: "Choose one of your sending identities.",
    };
  }
  const domain = domainOfEmail(email);

  const identity = input.identities.find(
    (i) => i.workspaceId === input.workspaceId && i.domain.workspaceId === input.workspaceId && i.fromEmail === email
  );
  if (identity) {
    if (!isDomainSendable(identity.domain)) {
      return {
        ok: false,
        code: "DOMAIN_NOT_VERIFIED",
        reason: `${identity.domain.domain} is not fully authenticated yet, so ${email} can't be used to send.`,
        resolution: "Finish DNS verification in Settings → Sending Domains (ownership, DKIM and SPF must all pass).",
      };
    }
    return { ok: true, mode: "WORKSPACE_DOMAIN", identity };
  }

  if (input.managedDomains.some((m) => domain === m || domain.endsWith(`.${m}`))) {
    return { ok: true, mode: "ZENDMAIL_MANAGED" };
  }

  return {
    ok: false,
    code: "NO_IDENTITY",
    reason: `${email} isn't a verified sending identity in this workspace.`,
    resolution: "Add and verify your domain in Settings → Sending Domains, create a sending identity, then select it as the From address.",
  };
}

// ---------------------------------------------------------------------------
// DMARC
// ---------------------------------------------------------------------------

export type DmarcResult = { found: boolean; policy: "none" | "quarantine" | "reject" | null };

/** Parses the TXT records returned for `_dmarc.<domain>`. TXT chunks must already be joined per record. */
export function parseDmarc(txtRecords: string[]): DmarcResult {
  const record = txtRecords.find((r) => /^\s*v=DMARC1\s*(;|$)/i.test(r));
  if (!record) return { found: false, policy: null };
  const match = record.match(/(?:^|;)\s*p\s*=\s*(none|quarantine|reject)\s*(?:;|$)/i);
  return { found: true, policy: match ? (match[1].toLowerCase() as "none" | "quarantine" | "reject") : null };
}

// ---------------------------------------------------------------------------
// Delivery health
// ---------------------------------------------------------------------------

/** Below this many sends, rates are noise — we say so instead of showing a score. */
export const MIN_SAMPLE_FOR_RATES = 100;
export const BOUNCE_RATE_WARN = 0.02;
export const BOUNCE_RATE_BLOCK = 0.05;
export const COMPLAINT_RATE_WARN = 0.001;
export const COMPLAINT_RATE_BLOCK = 0.003;

export type HealthCounts = { sent: number; delivered: number; bounced: number; complained: number; unsubscribed: number };

export type HealthRates =
  | { sufficient: false; sent: number }
  | { sufficient: true; sent: number; bounceRate: number; complaintRate: number; unsubscribeRate: number; deliveryRate: number | null };

export function computeRates(counts: HealthCounts): HealthRates {
  if (counts.sent < MIN_SAMPLE_FOR_RATES) return { sufficient: false, sent: counts.sent };
  return {
    sufficient: true,
    sent: counts.sent,
    bounceRate: counts.bounced / counts.sent,
    complaintRate: counts.complained / counts.sent,
    unsubscribeRate: counts.unsubscribed / counts.sent,
    // Delivery confirmations only exist if the provider webhook is configured.
    deliveryRate: counts.delivered > 0 ? counts.delivered / counts.sent : null,
  };
}
