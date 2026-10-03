import "server-only";
import type { DnsRecord } from "@/db/schema";

export type SendEmailInput = {
  to: string;
  /** Full RFC 5322 "From" value, e.g. `Zendmail <hello@yourdomain.com>`. */
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export type ProviderDomain = {
  providerDomainId: string;
  /** Records the user must publish, normalized. Status reflects the provider's latest view. */
  records: DnsRecord[];
};

/** A provider webhook, normalized to what Zendmail acts on. Unknown event kinds map to null. */
export type NormalizedProviderEvent = {
  type: "DELIVERED" | "BOUNCED" | "COMPLAINED";
  providerMessageId: string;
  recipients: string[];
  /** true = hard bounce, false = transient, null = provider didn't say. */
  permanent: boolean | null;
  occurredAt: Date;
};

export class ProviderNotConfiguredError extends Error {
  constructor(message = "No email provider is configured. Set EMAIL_PROVIDER_API_KEY to enable sending-domain verification.") {
    super(message);
    this.name = "ProviderNotConfiguredError";
  }
}

/**
 * Everything Zendmail needs from an email provider. Adapters implement the
 * subset their API supports; domain methods throw ProviderNotConfiguredError
 * where the provider can't (yet) do it, so the UI reports that honestly
 * instead of pretending.
 */
export interface EmailProvider {
  readonly name: string;
  /** True only when messages are really delivered and domains can be managed. */
  readonly live: boolean;
  send(input: SendEmailInput): Promise<{ messageId: string | null }>;
  createDomain(domain: string): Promise<ProviderDomain>;
  /** Ask the provider to (re)check DNS, then return its latest view. */
  verifyDomain(providerDomainId: string): Promise<ProviderDomain>;
  deleteDomain(providerDomainId: string): Promise<void>;
  /** Maps a provider webhook payload to a normalized event (bounce / complaint / delivery). */
  parseWebhookEvent(payload: unknown): NormalizedProviderEvent | null;
}

// ---------------------------------------------------------------------------
// Console (development) — nothing is delivered.
// ---------------------------------------------------------------------------

class ConsoleEmailProvider implements EmailProvider {
  readonly name = "CONSOLE";
  readonly live = false;

  async send(input: SendEmailInput) {
    console.log("─── [dev email — not delivered] ─────────────");
    console.log("From:", input.from);
    if (input.replyTo) console.log("Reply-To:", input.replyTo);
    console.log("To:", input.to);
    console.log("Subject:", input.subject);
    console.log(input.text);
    console.log("──────────────────────────────────────────────");
    return { messageId: null };
  }
  async createDomain(): Promise<ProviderDomain> {
    throw new ProviderNotConfiguredError();
  }
  async verifyDomain(): Promise<ProviderDomain> {
    throw new ProviderNotConfiguredError();
  }
  async deleteDomain(): Promise<void> {
    /* nothing was ever created */
  }
  parseWebhookEvent() {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Resend — plain HTTPS, no SDK. Implemented against Resend's documented
// Emails and Domains APIs; NOT yet exercised against a live Resend account.
// ---------------------------------------------------------------------------

type ResendRecord = { record?: string; name?: string; type?: string; value?: string; status?: string; priority?: number };
type ResendDomain = { id?: string; records?: ResendRecord[] };

function mapStatus(status: string | undefined): DnsRecord["status"] {
  switch (status) {
    case "verified":
      return "PASSING";
    case "failed":
      return "FAILING";
    case "pending":
    case "temporary_failure":
      return "PENDING";
    default:
      return "NOT_CHECKED";
  }
}

/** Exported for tests. Skips record families Zendmail doesn't use (e.g. inbound "Receiving"). */
export function mapResendRecords(records: ResendRecord[] | undefined): DnsRecord[] {
  const out: DnsRecord[] = [];
  for (const r of records ?? []) {
    if (!r.value || !r.type) continue;
    const type = r.type.toUpperCase();
    if (type !== "TXT" && type !== "CNAME" && type !== "MX") continue;
    let purpose: DnsRecord["purpose"] | null = null;
    if (r.record === "DKIM") purpose = "DKIM";
    else if (r.record === "SPF") purpose = type === "MX" ? "RETURN_PATH" : "SPF";
    if (!purpose) continue;
    out.push({
      type,
      host: r.name && r.name.length > 0 ? r.name : "@",
      value: r.value,
      ...(typeof r.priority === "number" ? { priority: r.priority } : {}),
      purpose,
      status: mapStatus(r.status),
    });
  }
  return out;
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "RESEND";
  readonly live = true;

  constructor(private readonly apiKey: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`https://api.resend.com${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      // Surface the provider's reason without ever logging the key.
      let detail = "";
      try {
        const err = (await response.json()) as { message?: string; name?: string };
        detail = err.message ?? err.name ?? "";
      } catch {
        /* non-JSON error body */
      }
      throw new Error(`Email provider rejected the request (${response.status})${detail ? `: ${detail}` : ""}`);
    }
    return (await response.json().catch(() => ({}))) as T;
  }

  async send(input: SendEmailInput) {
    const result = await this.request<{ id?: string }>("POST", "/emails", {
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      ...(input.headers ? { headers: input.headers } : {}),
    });
    return { messageId: result.id ?? null };
  }

  async createDomain(domain: string): Promise<ProviderDomain> {
    const created = await this.request<ResendDomain>("POST", "/domains", { name: domain });
    if (!created.id) throw new Error("Email provider did not return a domain id.");
    return { providerDomainId: created.id, records: mapResendRecords(created.records) };
  }

  async verifyDomain(providerDomainId: string): Promise<ProviderDomain> {
    const id = encodeURIComponent(providerDomainId);
    await this.request("POST", `/domains/${id}/verify`);
    const latest = await this.request<ResendDomain>("GET", `/domains/${id}`);
    return { providerDomainId, records: mapResendRecords(latest.records) };
  }

  async deleteDomain(providerDomainId: string) {
    await this.request("DELETE", `/domains/${encodeURIComponent(providerDomainId)}`);
  }

  parseWebhookEvent(payload: unknown): NormalizedProviderEvent | null {
    const p = payload as { type?: string; created_at?: string; data?: { email_id?: string; to?: string[] | string; bounce?: { type?: string } } };
    const data = p?.data;
    if (!p?.type || !data?.email_id) return null;

    const type = p.type === "email.delivered" ? "DELIVERED" : p.type === "email.bounced" ? "BOUNCED" : p.type === "email.complained" ? "COMPLAINED" : null;
    if (!type) return null;

    let permanent: boolean | null = null;
    if (type === "BOUNCED" && data.bounce?.type) permanent = /permanent|hard/i.test(data.bounce.type);

    const to = Array.isArray(data.to) ? data.to : data.to ? [data.to] : [];
    const occurred = p.created_at ? new Date(p.created_at) : new Date();
    return {
      type,
      providerMessageId: data.email_id,
      recipients: to.map((e) => e.toLowerCase()),
      permanent,
      occurredAt: Number.isNaN(occurred.getTime()) ? new Date() : occurred,
    };
  }
}

const apiKey = process.env.EMAIL_PROVIDER_API_KEY?.trim();

/** The active provider. Swap or add adapters here — callers depend only on the interface. */
export const emailProvider: EmailProvider = apiKey ? new ResendEmailProvider(apiKey) : new ConsoleEmailProvider();
