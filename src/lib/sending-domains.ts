export type SendingDomainStatus = "PENDING" | "VERIFIED" | "FAILED";
export type AuthenticationStatus = "PENDING" | "PASSING" | "FAILED" | "RECOMMENDED";

export type DnsRecord = {
  type: "TXT" | "CNAME" | "MX";
  host: string;
  value: string;
  purpose: "SPF" | "DKIM" | "DMARC" | "MAIL_FROM" | "OWNERSHIP";
  status: "PENDING" | "PASSING" | "FAILED" | "RECOMMENDED";
};

export type SendabilityCheckInput = {
  fromEmail: string;
  replyTo?: string;
  status?: SendingDomainStatus;
  domainVerified?: boolean;
  workspaceVerifiedDomain?: boolean;
  customMailFromConfigured?: boolean;
};

export function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//i, "").replace(/\/$/, "").replace(/^\*\./, "");
}

export function extractDomain(email: string) {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return "";
  return normalizeDomain(trimmed.slice(at + 1));
}

export function generateDnsRecords(domain: string): DnsRecord[] {
  const normalized = normalizeDomain(domain);
  const host = normalized;
  return [
    {
      type: "TXT",
      host: "@",
      value: "v=spf1 include:_spf.resend.com ~all",
      purpose: "SPF",
      status: "PENDING",
    },
    {
      type: "CNAME",
      host: "resend._domainkey",
      value: `resend._domainkey.${host}.resend.dev`,
      purpose: "DKIM",
      status: "PENDING",
    },
    {
      type: "TXT",
      host: "_dmarc",
      value: "v=DMARC1; p=none; rua=mailto:dmarc@" + normalized,
      purpose: "DMARC",
      status: "RECOMMENDED",
    },
    {
      type: "MX",
      host: host,
      value: "feedback-smtp." + normalized,
      purpose: "MAIL_FROM",
      status: "PENDING",
    },
    {
      type: "TXT",
      host: "@",
      value: `zendmail-domain-verification=${normalized}`,
      purpose: "OWNERSHIP",
      status: "PENDING",
    },
  ];
}

export function buildDomainVerificationSummary(status: SendingDomainStatus, spfStatus?: AuthenticationStatus, dkimStatus?: AuthenticationStatus) {
  return {
    status,
    spf: spfStatus ?? "PENDING",
    dkim: dkimStatus ?? "PENDING",
    dmarc: "RECOMMENDED",
    ready: status === "VERIFIED" && (spfStatus === "PASSING" || spfStatus === "PENDING") && (dkimStatus === "PASSING" || dkimStatus === "PENDING"),
  };
}

export function collectSendabilityErrors(input: SendabilityCheckInput) {
  const errors: string[] = [];
  const email = input.fromEmail.trim();
  const domain = extractDomain(email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Enter a valid sender email address.");
    return errors;
  }

  if (!domain) {
    errors.push("The sender address must include a valid domain.");
    return errors;
  }

  if (!input.domainVerified && !input.workspaceVerifiedDomain) {
    errors.push(`The sending domain ${domain} is not verified for this workspace. Add and verify the domain before sending.`);
  }

  if (input.status && input.status !== "VERIFIED") {
    errors.push(`The sending domain ${domain} is not in a verified state. Complete domain verification and retry.`);
  }

  if (input.replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.replyTo)) {
    errors.push("Reply-To must be a valid email address.");
  }

  if (!input.customMailFromConfigured && input.status === "VERIFIED") {
    // This is a non-blocking recommendation, not a reject condition.
    return errors;
  }

  return errors;
}

export function validateDomainOwnership(domain: string) {
  const normalized = normalizeDomain(domain);
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(normalized);
}

export function canSendFromDomain(status: SendingDomainStatus | undefined, verified = false) {
  return (status ?? "PENDING") === "VERIFIED" || verified;
}

export function ensureWorkspaceDomainAccess({ workspaceVerifiedDomain, senderWorkspaceId, identityWorkspaceId }: { workspaceVerifiedDomain: boolean; senderWorkspaceId?: string; identityWorkspaceId?: string }) {
  if (!workspaceVerifiedDomain) return "This sender is not authorized for the current workspace.";
  if (senderWorkspaceId && identityWorkspaceId && senderWorkspaceId !== identityWorkspaceId) {
    return "This sender belongs to a different workspace.";
  }
  return null;
}
