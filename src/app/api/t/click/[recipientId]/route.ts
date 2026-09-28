import { NextResponse } from "next/server";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db/client";
import { campaignRecipients } from "@/db/schema";

export async function GET(req: Request, { params }: { params: Promise<{ recipientId: string }> }) {
  const { recipientId } = await params;
  const url = new URL(req.url);
  const target = url.searchParams.get("url");

  if (!target) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    await db
      .update(campaignRecipients)
      .set({ clickedAt: new Date() })
      .where(and(eq(campaignRecipients.id, recipientId), isNull(campaignRecipients.clickedAt)));
  } catch {
    // An invalid/expired recipient id shouldn't prevent the click-through.
  }

  // Only ever redirect to an absolute http(s) URL the email itself embedded —
  // never to a relative path or javascript: scheme.
  try {
    const parsed = new URL(target);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return NextResponse.redirect(parsed);
    }
  } catch {
    // fall through to home redirect below
  }

  return NextResponse.redirect(new URL("/", req.url));
}
