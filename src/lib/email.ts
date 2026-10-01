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

/** Domains verified with the provider; campaigns may send "from" addresses on these. */
const VERIFIED_DOMAINS = (process.env.EMAIL_VERIFIED_DOMAINS ?? "")
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

/**
 * Providers reject (or spam-folder) mail "from" a domain you haven't verified. So the
 * workspace's chosen From name is kept, but if its address isn't on a verified domain
 * the message goes out from DEFAULT_FROM with Reply-To set to the workspace's address.
 */
function resolveSender(fromName: string, fromEmail: string) {
  const domain = fromEmail.split("@")[1]?.toLowerCase() ?? "";
  if (VERIFIED_DOMAINS.includes(domain)) {
    return { from: formatFrom(fromName, fromEmail), replyTo: undefined };
  }
  return { from: formatFrom(fromName, addressOf(DEFAULT_FROM)), replyTo: fromEmail };
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
  subject: string;
  html: string;
  text: string;
  /** Per-recipient unsubscribe link; added as a List-Unsubscribe header so mail apps show an "Unsubscribe" button. */
  unsubscribeUrl?: string;
}) {
  const { from, replyTo } = resolveSender(input.fromName, input.fromEmail);
  await provider.send({
    to: input.to,
    from,
    replyTo,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: input.unsubscribeUrl ? { "List-Unsubscribe": `<${input.unsubscribeUrl}>` } : undefined,
  });
}
