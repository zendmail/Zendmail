import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sendingDomains, webhookEvents } from "@/db/schema";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET?.trim();

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    return Response.json({ error: "Webhook secret is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("x-resend-signature") ?? "";
  const timestamp = request.headers.get("x-resend-timestamp") ?? "";
  const rawBody = await request.text();

  if (!signature || !timestamp) {
    return Response.json({ error: "Missing webhook signature headers." }, { status: 400 });
  }

  const payload = `${timestamp}.${rawBody}`;
  const digest = createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
  const expected = Buffer.from(digest, "hex");
  const actual = Buffer.from(signature, "hex");

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const body = safeJsonParse<{ id?: string; type?: string; data?: { email?: string; domain?: string } }>(rawBody);
  if (!body?.id || !body.type) {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const [existing] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, body.id)).limit(1);
  if (existing) {
    return Response.json({ ok: true, duplicate: true });
  }

  await db.insert(webhookEvents).values({
    id: body.id,
    type: body.type,
    processedAt: new Date(),
  });

  const domain = typeof body.data?.domain === "string" ? body.data.domain : undefined;
  if (domain) {
    await db
      .update(sendingDomains)
      .set({
        status: "FAILED",
        updatedAt: new Date(),
      })
      .where(and(eq(sendingDomains.domain, domain), eq(sendingDomains.status, "VERIFIED")));
  }

  return Response.json({ ok: true });
}
