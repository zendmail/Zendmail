import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { sendDueScheduledCampaigns } from "@/lib/campaigns";

// Scheduled via vercel.json to run every minute. A campaign is only
// ever picked up once its status is SCHEDULED and scheduledAt has
// passed — dispatchCampaign() flips status to SENT (or FAILED) as its
// first durable side effect per campaign, so a slow run that overlaps
// the next cron tick won't double-send.
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDueScheduledCampaigns();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("send-scheduled-campaigns cron failed:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
