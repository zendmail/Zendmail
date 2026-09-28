import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { campaignRecipients, contacts, suppressionEntries } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit";

function page(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${title}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;background:#F7F8FA;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;}
.card{background:#fff;border:1px solid #E3E7ED;border-radius:14px;padding:32px;max-width:440px;width:100%;text-align:center;}
h1{font-size:18px;color:#10151C;margin:0 0 8px;}
p{color:#5B6472;font-size:14px;line-height:1.5;margin:0 0 20px;}
.opt{display:block;width:100%;text-align:left;border:1px solid #E3E7ED;border-radius:10px;padding:14px 16px;margin-bottom:10px;background:#fff;cursor:pointer;font-family:inherit;}
.opt:hover{background:#F3F4F7;border-color:#CDD2DD;}
.opt-title{font-size:14px;font-weight:600;color:#0D1117;margin:0 0 3px;}
.opt-desc{font-size:12.5px;color:#4B5565;margin:0;}
.opt.danger .opt-title{color:#D92D20;}
form{margin:0;}
</style>
</head><body><div class="card">${body}</div></body></html>`;
}

function errorPage() {
  return page(
    "Link expired",
    "<h1>This link has expired</h1><p>We couldn't find this subscription — it may already be unsubscribed.</p>"
  );
}

async function loadContact(recipientId: string) {
  const [recipient] = await db
    .select({ contactId: campaignRecipients.contactId })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.id, recipientId))
    .limit(1);
  if (!recipient) return null;

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, recipient.contactId)).limit(1);
  return contact ?? null;
}

/**
 * Smart Unsubscribe: rather than a single "you're unsubscribed forever"
 * link, this shows real alternatives first. A contact who's opting out
 * because of *volume*, not because they don't want to hear from the
 * business at all, gets a way to say that — instead of the business
 * losing them entirely, which is what a plain unsubscribe link forces
 * every time regardless of the actual reason.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ recipientId: string }> }) {
  const { recipientId } = await params;
  const contact = await loadContact(recipientId);
  if (!contact) {
    return new NextResponse(errorPage(), { headers: { "Content-Type": "text/html" }, status: 404 });
  }

  const body = `
    <h1>Manage your emails</h1>
    <p>${contact.email} — choose what works better for you. You can change this again anytime.</p>
    <form method="POST" action="/api/t/unsubscribe/${recipientId}">
      <button class="opt" type="submit" name="choice" value="reduce">
        <p class="opt-title">Send me less</p>
        <p class="opt-desc">Get at most 1 email a week instead of every campaign.</p>
      </button>
      <button class="opt" type="submit" name="choice" value="pause">
        <p class="opt-title">Pause for 30 days</p>
        <p class="opt-desc">No emails for a month, then resume automatically as normal.</p>
      </button>
      <button class="opt danger" type="submit" name="choice" value="unsubscribe">
        <p class="opt-title">Unsubscribe completely</p>
        <p class="opt-desc">Stop all marketing emails from this business.</p>
      </button>
    </form>
  `;
  return new NextResponse(page("Manage your emails", body), { headers: { "Content-Type": "text/html" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ recipientId: string }> }) {
  const { recipientId } = await params;
  const contact = await loadContact(recipientId);
  if (!contact) {
    return new NextResponse(errorPage(), { headers: { "Content-Type": "text/html" }, status: 404 });
  }

  const formData = await req.formData();
  const choice = String(formData.get("choice") ?? "unsubscribe");

  if (choice === "reduce") {
    await db
      .update(contacts)
      .set({ maxEmailsPerWeek: 1, updatedAt: new Date() })
      .where(eq(contacts.id, contact.id));
    await recordAuditLog({
      action: "contact.frequency_reduced",
      workspaceId: contact.workspaceId,
      metadata: { contactId: contact.id, via: "email_link" },
    });
    return new NextResponse(
      page(
        "Preferences updated",
        `<h1>Done — you'll get less</h1><p>${contact.email} is now capped at one email a week, no matter how many campaigns are sent. You're still subscribed.</p>`
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (choice === "pause") {
    const pausedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.update(contacts).set({ pausedUntil, updatedAt: new Date() }).where(eq(contacts.id, contact.id));
    await recordAuditLog({
      action: "contact.paused",
      workspaceId: contact.workspaceId,
      metadata: { contactId: contact.id, pausedUntil: pausedUntil.toISOString(), via: "email_link" },
    });
    return new NextResponse(
      page(
        "Paused",
        `<h1>You're paused for 30 days</h1><p>${contact.email} won't receive any marketing emails until ${pausedUntil.toLocaleDateString()}. No action needed — it resumes automatically.</p>`
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Default / explicit choice=unsubscribe: the original hard opt-out.
  await db
    .update(contacts)
    .set({ status: "UNSUBSCRIBED", consentStatus: "WITHDRAWN", updatedAt: new Date() })
    .where(eq(contacts.id, contact.id));
  await db
    .insert(suppressionEntries)
    .values({ workspaceId: contact.workspaceId, email: contact.email, reason: "UNSUBSCRIBED" })
    .onConflictDoNothing();
  await recordAuditLog({
    action: "contact.unsubscribed",
    workspaceId: contact.workspaceId,
    metadata: { contactId: contact.id, via: "email_link" },
  });

  return new NextResponse(
    page(
      "Unsubscribed",
      `<h1>You've been unsubscribed</h1><p>${contact.email} will no longer receive marketing emails from this business.</p>`
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}
