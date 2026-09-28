import { NextResponse } from "next/server";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db/client";
import { campaignRecipients } from "@/db/schema";

// A 1x1 transparent GIF, served regardless of whether the update below
// succeeds — a tracking pixel must never break the email for a client
// that renders it (missing image, blocked cookie, expired recipient id).
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7",
  "base64"
);

export async function GET(_req: Request, { params }: { params: Promise<{ recipientId: string }> }) {
  const { recipientId } = await params;

  try {
    await db
      .update(campaignRecipients)
      .set({ openedAt: new Date() })
      .where(and(eq(campaignRecipients.id, recipientId), isNull(campaignRecipients.openedAt)));
  } catch {
    // Swallow — an invalid/expired recipient id shouldn't surface an error to the email client.
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
