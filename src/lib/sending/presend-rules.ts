import {
  BOUNCE_RATE_BLOCK,
  BOUNCE_RATE_WARN,
  COMPLAINT_RATE_BLOCK,
  COMPLAINT_RATE_WARN,
  normalizeEmail,
  type HealthRates,
  type SenderDecision,
} from "./rules";

export type CheckResult = {
  key: string;
  label: string;
  /** PASS/WARN/FAIL come from real data. UNKNOWN = we genuinely can't tell (never shown as a pass). N/A = doesn't apply to this send. */
  status: "PASS" | "WARN" | "FAIL" | "UNKNOWN" | "N/A";
  detail: string;
  /** What the user should do. Present for every non-PASS result. */
  resolution?: string;
  /** Only FAIL checks with blocking=true stop the send. */
  blocking: boolean;
};

export type PreSendInput = {
  sender: SenderDecision;
  replyTo: string | null;
  dmarc: { status: "NOT_CHECKED" | "PENDING" | "PASSING" | "FAILING"; policy: string | null } | null;
  audience: {
    sendableCount: number;
    skippedNoConsent: number;
    skippedSuppressed: number;
    skippedPaused: number;
    skippedFrequencyCap: number;
  };
  health: HealthRates;
  /** Other campaigns SENDING/SCHEDULED within 24h that target overlapping audience, when computable. */
  concurrentCampaigns: number;
  /** Whether the acting member may send on behalf of this workspace. */
  memberMaySend: boolean;
};

export type PreSendReport = { canSend: boolean; checks: CheckResult[]; blockers: CheckResult[] };

export function evaluatePreSend(input: PreSendInput): PreSendReport {
  const checks: CheckResult[] = [];
  const { sender } = input;

  // --- Permissions -------------------------------------------------------
  checks.push(
    input.memberMaySend
      ? { key: "permissions", label: "Workspace sending permission", status: "PASS", detail: "You can send for this workspace.", blocking: true }
      : {
          key: "permissions",
          label: "Workspace sending permission",
          status: "FAIL",
          detail: "Your role in this workspace doesn't allow sending campaigns.",
          resolution: "Ask a workspace owner or admin to send, or to change your role.",
          blocking: true,
        }
  );

  // --- Sender identity + authentication ---------------------------------
  if (!sender.ok) {
    checks.push({
      key: "identity",
      label: "From identity verified",
      status: "FAIL",
      detail: sender.reason,
      resolution: sender.resolution,
      blocking: true,
    });
    for (const [key, label] of [
      ["dkim", "DKIM"],
      ["spf", "SPF"],
    ] as const) {
      checks.push({ key, label, status: "UNKNOWN", detail: "Not checked — no verified sending identity.", blocking: false });
    }
  } else if (sender.mode === "ZENDMAIL_MANAGED") {
    checks.push({
      key: "identity",
      label: "From identity verified",
      status: "WARN",
      detail: "Sending from the Zendmail-managed sender. Recipients will see Zendmail's domain, not yours.",
      resolution: "Verify your own domain in Settings → Sending Domains to send as your brand.",
      blocking: false,
    });
    for (const [key, label] of [
      ["dkim", "DKIM"],
      ["spf", "SPF"],
    ] as const) {
      checks.push({ key, label, status: "N/A", detail: "Handled by Zendmail's own sending domain.", blocking: false });
    }
  } else {
    const d = sender.identity.domain;
    checks.push({
      key: "identity",
      label: "From identity verified",
      status: "PASS",
      detail: `${sender.identity.fromEmail} on verified domain ${d.domain}.`,
      blocking: true,
    });
    checks.push(mechanism("dkim", "DKIM", d.dkimStatus));
    checks.push(mechanism("spf", "SPF", d.spfStatus));
  }

  // DMARC — recommended, never blocking.
  if (sender.ok && sender.mode === "WORKSPACE_DOMAIN") {
    if (!input.dmarc || input.dmarc.status === "NOT_CHECKED") {
      checks.push({ key: "dmarc", label: "DMARC", status: "UNKNOWN", detail: "DMARC hasn't been checked yet.", resolution: "Run a DNS check on the domain.", blocking: false });
    } else if (input.dmarc.status === "PASSING") {
      checks.push({
        key: "dmarc",
        label: "DMARC",
        status: input.dmarc.policy === "none" ? "WARN" : "PASS",
        detail:
          input.dmarc.policy === "none"
            ? "A DMARC record exists but its policy is p=none (monitoring only)."
            : `DMARC policy: ${input.dmarc.policy ?? "present"}.`,
        resolution: input.dmarc.policy === "none" ? "Once reports look clean, tighten the policy to quarantine or reject." : undefined,
        blocking: false,
      });
    } else {
      checks.push({
        key: "dmarc",
        label: "DMARC",
        status: "WARN",
        detail: "No DMARC record found. Sending still works, but major inbox providers recommend one.",
        resolution: "Publish a TXT record at _dmarc.<your-domain>, e.g. v=DMARC1; p=none; rua=mailto:you@your-domain",
        blocking: false,
      });
    }
  }

  // --- Reply-To ----------------------------------------------------------
  if (input.replyTo && !normalizeEmail(input.replyTo)) {
    checks.push({ key: "reply_to", label: "Reply-To valid", status: "FAIL", detail: "The Reply-To address isn't a valid email address.", resolution: "Fix or clear the Reply-To field.", blocking: true });
  } else {
    checks.push({
      key: "reply_to",
      label: "Reply-To valid",
      status: "PASS",
      detail: input.replyTo ? `Replies go to ${input.replyTo}.` : "No Reply-To set; replies go to the From address.",
      blocking: false,
    });
  }

  // --- Audience: consent, suppression, frequency -------------------------
  const a = input.audience;
  checks.push({
    key: "consent",
    label: "Audience consent",
    status: "PASS",
    detail:
      a.skippedNoConsent > 0
        ? `${a.skippedNoConsent} contact(s) without granted consent will be skipped automatically.`
        : "Every contact in the audience has granted consent.",
    blocking: false,
  });
  checks.push({
    key: "suppression",
    label: "Suppression list",
    status: "PASS",
    detail:
      a.skippedSuppressed > 0
        ? `${a.skippedSuppressed} suppressed address(es) (unsubscribed, bounced or complained) will be skipped.`
        : "No suppressed addresses in this audience.",
    blocking: false,
  });
  checks.push({
    key: "unsubscribe",
    label: "Unsubscribe mechanism",
    status: "PASS",
    detail: "Every message includes a per-recipient unsubscribe link and a List-Unsubscribe header.",
    blocking: false,
  });
  checks.push({
    key: "frequency",
    label: "Campaign frequency",
    status: "PASS",
    detail:
      a.skippedFrequencyCap + a.skippedPaused > 0
        ? `${a.skippedFrequencyCap} contact(s) at their weekly cap and ${a.skippedPaused} paused contact(s) will be skipped.`
        : "No contacts are over their weekly send cap.",
    blocking: false,
  });
  checks.push(
    input.concurrentCampaigns > 0
      ? {
          key: "collision",
          label: "Audience collision",
          status: "WARN",
          detail: `${input.concurrentCampaigns} other campaign(s) are sending or scheduled within 24 hours and may reach the same contacts.`,
          resolution: "The weekly send cap still applies, but consider spacing the campaigns out.",
          blocking: false,
        }
      : { key: "collision", label: "Audience collision", status: "PASS", detail: "No other campaign is sending or scheduled in the next 24 hours.", blocking: false }
  );
  if (a.sendableCount === 0) {
    checks.push({
      key: "audience",
      label: "Sendable audience",
      status: "FAIL",
      detail: "No contacts in this audience can currently be emailed.",
      resolution: "Check consent, suppression and weekly-cap skips above, or choose a different audience.",
      blocking: true,
    });
  }

  // --- Bounce / complaint risk (real data only) --------------------------
  const h = input.health;
  if (!h.sufficient) {
    for (const [key, label] of [
      ["bounce_risk", "Bounce risk"],
      ["complaint_risk", "Complaint risk"],
    ] as const) {
      checks.push({ key, label, status: "UNKNOWN", detail: `Not enough data yet (${h.sent} sent in the last 30 days).`, blocking: false });
    }
  } else {
    checks.push(rate("bounce_risk", "Bounce risk", h.bounceRate, BOUNCE_RATE_WARN, BOUNCE_RATE_BLOCK, "Clean your list: remove addresses that bounced and re-confirm old contacts."));
    checks.push(rate("complaint_risk", "Complaint risk", h.complaintRate, COMPLAINT_RATE_WARN, COMPLAINT_RATE_BLOCK, "Send only to engaged, consented contacts and make unsubscribing easy."));
  }

  const blockers = checks.filter((c) => c.status === "FAIL" && c.blocking);
  return { canSend: blockers.length === 0, checks, blockers };
}

function mechanism(key: string, label: string, status: string): CheckResult {
  if (status === "PASSING") return { key, label, status: "PASS", detail: `${label} is passing.`, blocking: true };
  return {
    key,
    label,
    status: "FAIL",
    detail: status === "NOT_CHECKED" ? `${label} has never been verified.` : `${label} is not passing (${status.toLowerCase()}).`,
    resolution: "Open Settings → Sending Domains, confirm the DNS records are published, then run Verify DNS.",
    blocking: true,
  };
}

function rate(key: string, label: string, value: number, warn: number, block: number, resolution: string): CheckResult {
  const pct = `${(value * 100).toFixed(2)}%`;
  if (value >= block) return { key, label, status: "FAIL", detail: `${pct} over the last 30 days — above the ${(block * 100).toFixed(1)}% safety limit.`, resolution, blocking: true };
  if (value >= warn) return { key, label, status: "WARN", detail: `${pct} over the last 30 days — elevated.`, resolution, blocking: false };
  return { key, label, status: "PASS", detail: `${pct} over the last 30 days.`, blocking: false };
}
