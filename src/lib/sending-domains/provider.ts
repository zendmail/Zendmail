import "server-only";
import type { DnsRecord, DnsRecordPurpose } from "@/db/schema";

/**
 * What the rest of the app knows about a sending domain at the provider. Keep this interface
 * provider-neutral: adding Amazon SES later means writing one more class that returns this shape.
 */
export type ProviderDomain = {
  providerDomainId: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
  statusNote: string | null;
  records: DnsRecord[];
};

export interface DomainProvider {
  readonly name: string;
  createDomain(domain: string): Promise<ProviderDomain>;
  /** Ask the provider to (re)check DNS now, then return the fresh state. */
  verifyDomain(providerDomainId: string): Promise<ProviderDomain>;
  deleteDomain(providerDomainId: string): Promise<void>;
}

/** Errors whose message is safe to show to the end user. */
export class DomainProviderError extends Error {
  constructor(message: string, readonly code: "ALREADY_CLAIMED" | "NOT_CONFIGURED" | "REJECTED" | "UNAVAILABLE") {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

type ResendRecord = {
  record?: string; // "SPF" | "DKIM" | "Receiving" | "Tracking" ...
  name: string;
  type: string;
  ttl?: string;
  status?: string;
  value: string;
  priority?: number;
};

type ResendDomain = {
  id: string;
  name?: string;
  status: string;
  records?: ResendRecord[];
};

const PURPOSES: Record<string, DnsRecordPurpose> = {
  spf: "SPF",
  dkim: "DKIM",
  dmarc: "DMARC",
  tracking: "TRACKING",
};

function toRecord(r: ResendRecord): DnsRecord {
  const type = r.type?.toUpperCase();
  return {
    purpose: PURPOSES[(r.record ?? "").toLowerCase()] ?? "OTHER",
    type: type === "MX" || type === "CNAME" ? type : "TXT",
    name: r.name,
    value: r.value,
    priority: r.priority ?? null,
    ttl: r.ttl ?? null,
    status: r.status ?? null,
  };
}

/**
 * Sending only needs the SPF + DKIM records. Resend can report "partially_verified" when sending is
 * verified but (optional) receiving isn't — so look at the sending records themselves.
 */
export function mapResendDomain(d: ResendDomain): ProviderDomain {
  const records = (d.records ?? []).map(toRecord);
  const sendingRecords = records.filter((r) => r.purpose === "SPF" || r.purpose === "DKIM");
  const sendingVerified = sendingRecords.length > 0 && sendingRecords.every((r) => r.status === "verified");

  let status: ProviderDomain["status"] = "PENDING";
  let statusNote: string | null = null;

  if (d.status === "verified" || sendingVerified) {
    status = "VERIFIED";
  } else if (d.status === "failed") {
    status = "FAILED";
    statusNote = "We couldn't find the DNS records within 72 hours. Check them at your domain host, then remove and re-add the domain.";
  } else if (d.status === "temporary_failure") {
    statusNote = "The DNS records are temporarily not being found. Emails will use the shared sender until they're back.";
  } else if (d.status === "not_started") {
    statusNote = "Add the DNS records below at your domain host, then click Verify.";
  } else {
    statusNote = "Waiting for DNS to update. This can take from a few minutes up to 24 hours.";
  }

  return { providerDomainId: d.id, status, statusNote, records };
}

class ResendDomainProvider implements DomainProvider {
  readonly name = "resend";
  constructor(private readonly apiKey: string) {}

  private async call(method: string, path: string, body?: unknown) {
    let response: Response;
    try {
      response = await fetch(`https://api.resend.com${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new DomainProviderError("We couldn't reach the email provider. Please try again in a moment.", "UNAVAILABLE");
    }

    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const message = String(json.message ?? "");
      console.error(`[resend ${method} ${path}] ${response.status}: ${message}`);
      if (response.status === 401 || response.status === 403) {
        // 403 on /domains with a "sending access" key is the usual cause: domain management needs a full-access key.
        throw new DomainProviderError(
          "The email provider rejected our credentials for domain management. Set EMAIL_DOMAINS_API_KEY to a full-access API key (sending-only keys can't manage domains).",
          "NOT_CONFIGURED"
        );
      }
      if (response.status === 409 || response.status === 422 || /already|exists|registered/i.test(message)) {
        throw new DomainProviderError(
          "This domain is already connected to another account. If it's yours, contact support so we can help you claim it.",
          "ALREADY_CLAIMED"
        );
      }
      throw new DomainProviderError(message || "The email provider couldn't process this domain.", "REJECTED");
    }
    return json;
  }

  async createDomain(domain: string) {
    const created = (await this.call("POST", "/domains", { name: domain })) as ResendDomain;
    // The create response already contains the records; read it back once to get the canonical state.
    const full = (await this.call("GET", `/domains/${created.id}`)) as ResendDomain;
    return mapResendDomain({ ...created, ...full });
  }

  async verifyDomain(providerDomainId: string) {
    await this.call("POST", `/domains/${providerDomainId}/verify`);
    const full = (await this.call("GET", `/domains/${providerDomainId}`)) as ResendDomain;
    return mapResendDomain(full);
  }

  async deleteDomain(providerDomainId: string) {
    try {
      await this.call("DELETE", `/domains/${providerDomainId}`);
    } catch (error) {
      // Already gone at the provider is fine — the goal is that it no longer exists.
      if (error instanceof DomainProviderError && error.code === "REJECTED") return;
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Local development (no EMAIL_PROVIDER_API_KEY)
// ---------------------------------------------------------------------------

/**
 * Lets the whole UI flow be exercised without a provider account: shows example records and
 * marks the domain verified when you click Verify. Never used in production.
 */
class SimulatedDomainProvider implements DomainProvider {
  readonly name = "simulated";

  private records(domain: string): DnsRecord[] {
    return [
      { purpose: "SPF", type: "TXT", name: "send", value: "v=spf1 include:example-provider.test ~all", status: "not_started" },
      { purpose: "DKIM", type: "TXT", name: "resend._domainkey", value: `p=EXAMPLE-DKIM-KEY-FOR-${domain}`, status: "not_started" },
    ];
  }

  async createDomain(domain: string) {
    return {
      providerDomainId: `sim_${domain}`,
      status: "PENDING" as const,
      statusNote: "Development mode: no email provider key is set, so verification is simulated.",
      records: this.records(domain),
    };
  }

  async verifyDomain(providerDomainId: string) {
    const domain = providerDomainId.replace(/^sim_/, "");
    return {
      providerDomainId,
      status: "VERIFIED" as const,
      statusNote: null,
      records: this.records(domain).map((r) => ({ ...r, status: "verified" })),
    };
  }

  async deleteDomain() {}
}

class UnconfiguredDomainProvider implements DomainProvider {
  readonly name = "unconfigured";
  private fail(): never {
    throw new DomainProviderError(
      "Email sending isn't set up on this server yet (missing EMAIL_PROVIDER_API_KEY). Contact the administrator.",
      "NOT_CONFIGURED"
    );
  }
  async createDomain(): Promise<ProviderDomain> {
    return this.fail();
  }
  async verifyDomain(): Promise<ProviderDomain> {
    return this.fail();
  }
  async deleteDomain() {}
}

/**
 * Managing domains needs a full-access Resend key; sending only needs a sending-access key.
 * EMAIL_DOMAINS_API_KEY lets you keep the powerful key separate (used only on this page) while
 * EMAIL_PROVIDER_API_KEY stays a low-privilege sending key. If it isn't set we fall back to the
 * sending key, which works if that key is full-access.
 */
export function getDomainProvider(): DomainProvider {
  const apiKey = (process.env.EMAIL_DOMAINS_API_KEY ?? process.env.EMAIL_PROVIDER_API_KEY)?.trim();
  if (apiKey) return new ResendDomainProvider(apiKey);
  return process.env.NODE_ENV === "production" ? new UnconfiguredDomainProvider() : new SimulatedDomainProvider();
}

export function domainProviderIsSimulated() {
  return getDomainProvider().name === "simulated";
}
