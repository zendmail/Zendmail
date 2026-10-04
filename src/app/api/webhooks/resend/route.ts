import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sentMessages, emailEvents, suppressionEntries, contacts } from "@/db/schema";
import { emailProvider } from "@/lib/email-provider";
import { verifySvixSignature } from "@/lib/sending/webhook-signature";

/**
 * Resend delivery webhooks (delivered / bounced / complained).
 *
 * Trust chain: signature (HMAC over the raw body, 5-minute window) -> provider message id ->
 * sent_messages ledger -> exactly one workspace. A payload that can't be tied to a message we
 * sent is acknowledged and ignored; it can never touch another workspace's data.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });

  const rawBody = await req.text();
  const svixId = req.headers.get("svix-id");
  const verified = verifySvixSignature({
    secret,
    id: svixId,
    timestamp: req.headers.get("svix-timestamp"),
    signatureHeader: req.headers.get("svix-signature"),
    rawBody,
  });
  if (!verified.ok) {
    console.error("Resend webhook rejected:", verified.reason);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = emailProvider.parseWebhookEvent(payload);
  if (!event) return NextResponse.json({ received: true, ignored: "unsupported event" });

  const [message] = await db
    .select()
    .from(sentMessages)
    .where(and(eq(sentMessages.provider, "RESEND"), eq(sentMessages.providerMessageId, event.providerMessageId)))
    .limit(1);
  if (!message) return NextResponse.json({ received: true, ignored: "unknown message" });

  try {
    const deduped = await db.transaction(async (tx) => {
      // The unique (provider, event id) index makes this insert the idempotency gate: a provider
      // retry of the same delivery inserts nothing, so no side effect below runs twice.
      const inserted = await tx
        .insert(emailEvents)
        .values({
          workspaceId: message.workspaceId,
          sentMessageId: message.id,
          provider: "RESEND",
          providerEventId: svixId!,
          type: event.type,
          permanent: event.permanent,
          occurredAt: event.occurredAt,
        })
        .onConflictDoNothing()
        .returning({ id: emailEvents.id });
      if (inserted.length === 0) return true;

      const suppressWith = event.type === "COMPLAINED" ? "COMPLAINED" : event.type === "BOUNCED" && event.permanent === true ? "BOUNCED" : null;
      if (suppressWith) {
        await tx
          .insert(suppressionEntries)
          .values({ workspaceId: message.workspaceId, email: message.toEmail, reason: suppressWith })
          .onConflictDoNothing();
        if (suppressWith === "BOUNCED") {
          await tx
            .update(contacts)
            .set({ status: "BOUNCED" })
            .where(and(eq(contacts.workspaceId, message.workspaceId), eq(contacts.email, message.toEmail)));
        }
      }
      return false;
    });
    return NextResponse.json({ received: true, deduped });
  } catch (err) {
    console.error("Resend webhook processing failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // provider retries
  }
}
