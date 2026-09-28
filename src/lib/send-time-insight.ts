import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { campaignRecipients, campaigns } from "@/db/schema";

export type SendTimeInsight =
  | { hasData: false }
  | { hasData: true; bestHourLabel: string; sampleSize: number };

function formatHour(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

/**
 * Builds a histogram of "hour of day an email was opened" across every
 * campaign this workspace has ever sent, and recommends the single hour
 * with the most opens. Deliberately simple (one signal: open time, not
 * a full ML model) — but it's real historical data specific to this
 * workspace's own audience, not a generic "Tuesday 10am" industry
 * benchmark every other tool quotes regardless of who you actually mail.
 * Requires at least 20 opens before showing a recommendation — fewer
 * than that and a single early-riser skews the "best hour" noisily.
 */
export async function getSendTimeInsight(workspaceId: string): Promise<SendTimeInsight> {
  const MIN_SAMPLE = 20;

  const rows = await db
    .select({ openedAt: campaignRecipients.openedAt })
    .from(campaignRecipients)
    .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
    .where(and(eq(campaigns.workspaceId, workspaceId), isNotNull(campaignRecipients.openedAt)));

  if (rows.length < MIN_SAMPLE) {
    return { hasData: false };
  }

  const hourCounts = new Array(24).fill(0);
  for (const row of rows) {
    if (row.openedAt) hourCounts[row.openedAt.getUTCHours()]++;
  }

  let bestHour = 0;
  for (let h = 1; h < 24; h++) {
    if (hourCounts[h] > hourCounts[bestHour]) bestHour = h;
  }

  return {
    hasData: true,
    bestHourLabel: `${formatHour(bestHour)} UTC`,
    sampleSize: rows.length,
  };
}

/** Full 24-hour histogram, for a future analytics chart. */
export async function getSendTimeHistogram(workspaceId: string) {
  const rows = await db
    .select({ openedAt: campaignRecipients.openedAt })
    .from(campaignRecipients)
    .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
    .where(and(eq(campaigns.workspaceId, workspaceId), isNotNull(campaignRecipients.openedAt)));

  const hourCounts = new Array(24).fill(0);
  for (const row of rows) {
    if (row.openedAt) hourCounts[row.openedAt.getUTCHours()]++;
  }
  return hourCounts;
}
