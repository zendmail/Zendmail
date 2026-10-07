import "server-only";

interface SendEmailInput {
  to: string;
  /** Full RFC 5322 "From" value, e.g. `Zendmail <hello@yourdomain.com>`. */
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}

/**
 * Development fallback: used when EMAIL_PROVIDER_API_KEY is not set. Nothing is
 * delivered — the message is printed to the terminal running `npm run dev`
 * (handy for grabbing verification and password-reset links).
 */
class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput) {
    console.log("─── [dev email — not delivered] ─────────────");
    console.log("From:", input.from);
    if (input.replyTo) console.log("Reply-To:", input.replyTo);
    console.log("To:", input.to);
    console.log("Subject:", input.subject);
    console.log(input.text);
    console.log("──────────────────────────────────────────────");
  }
}

/** Resend (https://resend.com) over plain HTTPS — no SDK dependency needed. */
class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async send(input: SendEmailInput) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.headers ? { headers: input.headers } : {}),
      }),
    });

    if (!response.ok) {
      // Surface the provider's reason (e.g. "domain is not verified") without ever logging the key.
      let detail = "";
      try {
        const body = (await response.json()) as { message?: string; name?: string };
        detail = body.message ?? body.name ?? "";
      } catch {
        /* non-JSON error body */
      }
      throw new Error(`Email provider rejected the message (${response.status})${detail ? `: ${detail}` : ""}`);
    }
  }
}

const apiKey = process.env.EMAIL_PROVIDER_API_KEY?.trim();
const provider: EmailProvider = apiKey ? new ResendEmailProvider(apiKey) : new ConsoleEmailProvider();

/** True when emails are really being delivered (a provider key is configured). */
export const emailDeliveryEnabled = Boolean(apiKey);

// ---------------------------------------------------------------------------
// Sender addresses
// ---------------------------------------------------------------------------

/**
 * Default sender for system mail and for anything sent from a domain we haven't verified.
 * Must be on a domain verified with your email provider. For first tests with Resend you
 * can use `Zendmail <onboarding@resend.dev>` (it only delivers to your own Resend account email).
 */
const DEFAULT_FROM = process.env.EMAIL_FROM?.trim() || "Zendmail <onboarding@resend.dev>";

/** Domains verified at platform level (always allowed). Per-workspace domains are added on top of these. */
const PLATFORM_VERIFIED_DOMAINS = (process.env.EMAIL_VERIFIED_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

function addressOf(from: string) {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim();
}

function formatFrom(name: string, email: string) {
  const safeName = name.replace(/["<>\r\n]/g, "").trim();
  return safeName ? `${safeName} <${email}>` : email;
}

/** Placeholder/undeliverable domains (e.g. the old default "hello@acme.zendmail.demo"): never use as Reply-To. */
function isUndeliverableDomain(domain: string) {
  return domain === "zendmail.demo" || domain.endsWith(".zendmail.demo") || domain === "resend.dev";
}

export type SenderResolution = {
  /** "own-domain": sent from the workspace's verified domain. "shared": sent from the platform address. */
  mode: "own-domain" | "shared";
  /** The full From header that recipients will see. */
  from: string;
  /** Where replies go (undefined = the From address itself). */
  replyTo?: string;
};

/**
 * Decides what recipients see.
 *
 *  - From address on a domain the workspace has verified (exact domain match) -> sent exactly as chosen.
 *  - Anything else (Gmail address, unverified domain, placeholder) -> sent from the platform's own
 *    verified address, keeping the chosen display name, with Reply-To pointing at the chosen address
 *    (or the campaign's explicit Reply-To) so replies still reach the business.
 *
 * Providers reject or spam-folder mail "from" a domain you haven't proven you own, which is why
 * the fallback exists instead of failing the send.
 */
export function resolveSender(input: {
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  verifiedDomains?: string[];
}): SenderResolution {
  const fromEmail = input.fromEmail.trim();
  const domain = fromEmail.split("@")[1]?.toLowerCase() ?? "";
  const allowed = new Set([...PLATFORM_VERIFIED_DOMAINS, ...(input.verifiedDomains ?? []).map((d) => d.toLowerCase())]);
  const explicitReplyTo = input.replyTo?.trim() || undefined;

  if (allowed.has(domain)) {
    return { mode: "own-domain", from: formatFrom(input.fromName, fromEmail), replyTo: explicitReplyTo };
  }

  const replyTo = explicitReplyTo ?? (isUndeliverableDomain(domain) ? undefined : fromEmail);
  return { mode: "shared", from: formatFrom(input.fromName, addressOf(DEFAULT_FROM)), replyTo };
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// System emails
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  await provider.send({
    to,
    from: DEFAULT_FROM,
    subject: "Verify your email for Zendmail",
    text: `Confirm your email address to finish setting up your account: ${verifyUrl}`,
    html: `<p>Confirm your email address to finish setting up your account.</p><p><a href="${escapeHtml(verifyUrl)}">Verify email</a></p>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await provider.send({
    to,
    from: DEFAULT_FROM,
    subject: "Reset your Zendmail password",
    text: `Reset your password using this link (expires in 1 hour): ${resetUrl}`,
    html: `<p>Reset your password using the link below. This link expires in 1 hour.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p>`,
  });
}

// ---------------------------------------------------------------------------
// Marketing emails
// ---------------------------------------------------------------------------

export async function sendCampaignEmail(input: {
  to: string;
  fromName: string;
  fromEmail: string;
  /** Explicit Reply-To chosen on the campaign (optional). */
  replyTo?: string | null;
  /** The workspace's verified sending domains (from getVerifiedDomainNames). */
  verifiedDomains?: string[];
  subject: string;
  html: string;
  text: string;
  /** Per-recipient unsubscribe link; added as a List-Unsubscribe header so mail apps show an "Unsubscribe" button. */
  unsubscribeUrl?: string;
}) {
  const sender = resolveSender(input);
  await provider.send({
    to: input.to,
    from: sender.from,
    replyTo: sender.replyTo,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: input.unsubscribeUrl ? { "List-Unsubscribe": `<${input.unsubscribeUrl}>` } : undefined,
  });
}
