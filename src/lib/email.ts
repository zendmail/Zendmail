import "server-only";
import { db } from "@/db/client";
import { sentMessages } from "@/db/schema";
import { emailProvider } from "./email-provider";
import { decideSender } from "./sending/rules";
import { listSenderCandidates } from "./sending/domains";

/** True when emails are really being delivered (a provider key is configured). */
export const emailDeliveryEnabled = emailProvider.live;

// ---------------------------------------------------------------------------
// Sender addresses
// ---------------------------------------------------------------------------

/**
 * Default sender for system mail and for anything sent from a domain we haven't verified.
 * Must be on a domain verified with your email provider. For first tests with Resend you
 * can use `Zendmail <onboarding@resend.dev>` (it only delivers to your own Resend account email).
 */
const DEFAULT_FROM = process.env.EMAIL_FROM?.trim() || "Zendmail <onboarding@resend.dev>";

/**
 * Platform-owned domains. An address here is never sent as-is: it goes out from
 * DEFAULT_FROM with the workspace's display name, so no tenant can impersonate
 * another tenant (or Zendmail) on a shared domain.
 */
export const MANAGED_DOMAINS = ["zendmail.demo", ...(process.env.EMAIL_VERIFIED_DOMAINS ?? "").split(",")]
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

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// System emails
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  await emailProvider.send({
    to,
    from: DEFAULT_FROM,
    subject: "Verify your email for Zendmail",
    text: `Confirm your email address to finish setting up your account: ${verifyUrl}`,
    html: `<p>Confirm your email address to finish setting up your account.</p><p><a href="${escapeHtml(verifyUrl)}">Verify email</a></p>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await emailProvider.send({
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

export class SenderNotAuthorizedError extends Error {
  constructor(
    message: string,
    readonly resolution: string
  ) {
    super(message);
    this.name = "SenderNotAuthorizedError";
  }
}

/**
 * Sends one marketing/automation message. The From address is resolved against
 * the WORKSPACE's verified sending identities — an unverified or foreign
 * address is refused (SenderNotAuthorizedError), never silently rewritten.
 * Every accepted message is recorded in sent_messages so provider webhooks
 * (bounces, complaints) can be mapped back to exactly one workspace.
 */
export async function sendCampaignEmail(input: {
  workspaceId: string;
  source: "CAMPAIGN" | "AUTOMATION" | "TEST" | "DOMAIN_TEST";
  to: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  /** Per-recipient unsubscribe link; added as a List-Unsubscribe header so mail apps show an "Unsubscribe" button. */
  unsubscribeUrl?: string;
}) {
  const decision = await resolveWorkspaceSender(input.workspaceId, input.fromEmail);
  if (!decision.ok) throw new SenderNotAuthorizedError(decision.reason, decision.resolution);

  const sender =
    decision.mode === "WORKSPACE_DOMAIN"
      ? {
          from: formatFrom(decision.identity.fromName, decision.identity.fromEmail),
          // The campaign's own Reply-To wins; otherwise the identity's.
          replyTo: input.replyTo || decision.identity.replyTo || undefined,
        }
      : { from: formatFrom(input.fromName, addressOf(DEFAULT_FROM)), replyTo: input.replyTo || undefined };

  const { messageId } = await emailProvider.send({
    to: input.to,
    from: sender.from,
    replyTo: sender.replyTo,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: input.unsubscribeUrl ? { "List-Unsubscribe": `<${input.unsubscribeUrl}>` } : undefined,
  });

  if (messageId) {
    await db
      .insert(sentMessages)
      .values({
        workspaceId: input.workspaceId,
        provider: emailProvider.name,
        providerMessageId: messageId,
        source: input.source,
        senderMode: decision.mode,
        sendingDomainId: decision.mode === "WORKSPACE_DOMAIN" ? decision.identity.domain.id : null,
        toEmail: input.to.toLowerCase(),
      })
      .onConflictDoNothing();
  }
  return { mode: decision.mode, providerMessageId: messageId };
}

async function resolveWorkspaceSender(workspaceId: string, fromEmail: string) {
  const identities = await listSenderCandidates(workspaceId);
  return decideSender({ workspaceId, fromEmail, identities, managedDomains: MANAGED_DOMAINS });
}
