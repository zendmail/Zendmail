import "server-only";
import { and, eq, desc, sql, lte, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, campaignRecipients, contacts, suppressionEntries, segments, segmentRules, workspaces, type EmailBlock } from "@/db/schema";
import { buildSegmentCondition, type RuleInput } from "./segments";
import { renderBlocksToHtml, renderBlocksToText } from "./email-blocks";
import { sendCampaignEmail } from "./email";
import { appUrl } from "./app-url";
import { getVerifiedDomainNames } from "./sending-domains/service";

export async function listCampaigns(workspaceId: string) {
  return db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.workspaceId, workspaceId), sql`${campaigns.deletedAt} is null`))
    .orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(workspaceId: string, campaignId: string) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.workspaceId, workspaceId)))
    .limit(1);
  return campaign ?? null;
}

export type AudienceDiagnostics = {
  sendable: (typeof contacts.$inferSelect)[];
  skippedNoConsent: number;
  skippedSuppressed: number;
  skippedPaused: number;
  skippedFrequencyCap: number;
};

/**
 * Resolves a campaign's audience to actual sendable contacts, and *why*
 * anyone was excluded. Three gates, in order:
 *
 *   1. Consent + suppression — never send to someone who hasn't opted
 *      in, or who's unsubscribed/bounced/complained.
 *   2. Smart Unsubscribe pause — a contact who chose "pause 30 days"
 *      (see the unsubscribe preference center) is skipped until that
 *      date passes, without ever touching their consent status.
 *   3. Send Frequency Guard — even a fully consented, unpaused contact
 *      is skipped if they've already received `cap` marketing emails
 *      in the trailing 7 days, counted across ALL campaigns in this
 *      workspace combined. The cap is per-contact
 *      (contacts.maxEmailsPerWeek) if set, otherwise the workspace
 *      default (workspaces.maxEmailsPerContactPerWeek). This is the
 *      gate most platforms skip — each campaign checks its own limits
 *      in isolation, so five "reasonable" campaigns in one week can
 *      still bury the same inbox.
 *
 * This is the single choke point every send path (manual send,
 * scheduled cron, review-step preview count) goes through, so what the
 * UI promises and what actually happens can't drift apart.
 */
export async function resolveSendableAudienceDetailed(
  workspaceId: string,
  audience: { audienceType: "ALL" | "SEGMENT"; segmentId: string | null }
): Promise<AudienceDiagnostics> {
  let audienceCondition;
  if (audience.audienceType === "SEGMENT" && audience.segmentId) {
    const rules = await db.select().from(segmentRules).where(eq(segmentRules.segmentId, audience.segmentId));
    const [segment] = await db.select().from(segments).where(eq(segments.id, audience.segmentId)).limit(1);
    audienceCondition = buildSegmentCondition(workspaceId, rules as RuleInput[], segment?.matchType ?? "ALL");
  } else {
    audienceCondition = and(eq(contacts.workspaceId, workspaceId), sql`${contacts.deletedAt} is null`)!;
  }

  const audienceRows = await db.select().from(contacts).where(audienceCondition);

  const suppressed = await db
    .select({ email: suppressionEntries.email })
    .from(suppressionEntries)
    .where(eq(suppressionEntries.workspaceId, workspaceId));
  const suppressedSet = new Set(suppressed.map((s) => s.email));

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const defaultCap = workspace?.maxEmailsPerContactPerWeek ?? 3;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // One query for everyone's recent-send counts, rather than one query
  // per contact — this is what keeps the frequency check cheap even for
  // a large audience.
  const recentSendCounts = await db
    .select({ contactId: campaignRecipients.contactId, count: sql<number>`count(*)::int` })
    .from(campaignRecipients)
    .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
    .where(
      and(
        eq(campaigns.workspaceId, workspaceId),
        eq(campaignRecipients.status, "SENT"),
        gte(campaignRecipients.sentAt, weekAgo)
      )
    )
    .groupBy(campaignRecipients.contactId);
  const recentSendMap = new Map(recentSendCounts.map((r) => [r.contactId, r.count]));

  const diagnostics: AudienceDiagnostics = {
    sendable: [],
    skippedNoConsent: 0,
    skippedSuppressed: 0,
    skippedPaused: 0,
    skippedFrequencyCap: 0,
  };

  for (const contact of audienceRows) {
    if (contact.consentStatus !== "GRANTED") {
      diagnostics.skippedNoConsent++;
      continue;
    }
    if (suppressedSet.has(contact.email)) {
      diagnostics.skippedSuppressed++;
      continue;
    }
    if (contact.pausedUntil && contact.pausedUntil > now) {
      diagnostics.skippedPaused++;
      continue;
    }
    const cap = contact.maxEmailsPerWeek ?? defaultCap;
    const recentCount = recentSendMap.get(contact.id) ?? 0;
    if (recentCount >= cap) {
      diagnostics.skippedFrequencyCap++;
      continue;
    }
    diagnostics.sendable.push(contact);
  }

  return diagnostics;
}

/** Convenience wrapper for callers that only need the sendable list, not the skip breakdown. */
export async function resolveSendableAudience(
  workspaceId: string,
  audience: { audienceType: "ALL" | "SEGMENT"; segmentId: string | null }
) {
  const { sendable } = await resolveSendableAudienceDetailed(workspaceId, audience);
  return sendable;
}

export async function countSendableAudience(
  workspaceId: string,
  audience: { audienceType: "ALL" | "SEGMENT"; segmentId: string | null }
) {
  return resolveSendableAudienceDetailed(workspaceId, audience);
}

/**
 * Actually sends a campaign: resolves the audience, renders and sends a
 * personalized (tracked) email per recipient, records each delivery, and
 * marks the campaign SENT. Shared by the "Send now" action (user-triggered)
 * and the scheduled-send cron route (time-triggered) — both must send
 * through this single code path so delivery behaves identically either way.
 */
export async function dispatchCampaign(workspaceId: string, campaignId: string) {
  // Atomically claim the campaign before doing any sending — this is the
  // guard against double-sends if a cron sweep overlaps a manual "Send
  // now" click, or two cron invocations overlap under retry/backoff.
  // Only a campaign still in DRAFT or SCHEDULED can be claimed; the
  // conditional UPDATE means at most one caller ever wins the race.
  const claimed = await db
    .update(campaigns)
    .set({ status: "SENDING", updatedAt: new Date() })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.workspaceId, workspaceId), sql`${campaigns.status} in ('DRAFT', 'SCHEDULED')`))
    .returning();

  if (claimed.length === 0) {
    throw new Error("Campaign is not in a sendable state (already sending, sent, or not found).");
  }
  const campaign = claimed[0];

  const audience = await resolveSendableAudience(workspaceId, {
    audienceType: campaign.audienceType,
    segmentId: campaign.segmentId,
  });

  const blocks = campaign.blocks as EmailBlock[];

  const verifiedDomains = await getVerifiedDomainNames(workspaceId);
  let failed = 0;
  for (const contact of audience) {
    const [recipient] = await db
      .insert(campaignRecipients)
      .values({ campaignId, contactId: contact.id, status: "PENDING" })
      .returning();

    const tracking = { recipientId: recipient.id };
    const html = renderBlocksToHtml(blocks, tracking);
    const text = renderBlocksToText(blocks, tracking);

    try {
      await sendCampaignEmail({
        to: contact.email,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        replyTo: campaign.replyTo,
        verifiedDomains,
        subject: campaign.subject,
        html,
        text,
        unsubscribeUrl: appUrl(`/api/t/unsubscribe/${recipient.id}`),
      });
    } catch (error) {
      // A single rejected address (or a provider hiccup) must not strand the whole campaign in SENDING.
      console.error(`[campaign ${campaignId}] send to recipient ${recipient.id} failed:`, error instanceof Error ? error.message : error);
      await db.update(campaignRecipients).set({ status: "FAILED" }).where(eq(campaignRecipients.id, recipient.id));
      failed += 1;
      continue;
    }

    await db
      .update(campaignRecipients)
      .set({ status: "SENT", sentAt: new Date() })
      .where(eq(campaignRecipients.id, recipient.id));
  }

  if (audience.length > 0 && failed === audience.length) {
    // Nothing went out at all (bad API key, unverified domain...). Put the campaign back so it can be fixed and retried.
    await db
      .update(campaigns)
      .set({ status: "DRAFT", updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));
    await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, campaignId));
    throw new Error("No emails could be sent. Check your email provider settings (API key and verified sending domain), then try again.");
  }

  await db
    .update(campaigns)
    .set({ status: "SENT", sentAt: new Date(), recipientCount: audience.length - failed, updatedAt: new Date() })
    .where(eq(campaigns.id, campaignId));

  return audience.length - failed;
}

/**
 * Finds every SCHEDULED campaign across all workspaces whose scheduledAt
 * has passed and sends it. Intended to be invoked by a real scheduler
 * (Vercel Cron, a queue worker, etc.) — see /api/cron/send-scheduled-campaigns.
 * Failures for one campaign are isolated so one bad campaign can't block
 * the rest of the sweep.
 */
export async function sendDueScheduledCampaigns() {
  const due = await db
    .select({ id: campaigns.id, workspaceId: campaigns.workspaceId })
    .from(campaigns)
    .where(and(eq(campaigns.status, "SCHEDULED"), lte(campaigns.scheduledAt, new Date())));

  const results = { sent: 0, failed: 0 };
  for (const c of due) {
    try {
      await dispatchCampaign(c.workspaceId, c.id);
      results.sent++;
    } catch (err) {
      results.failed++;
      console.error(`Failed to send scheduled campaign ${c.id}:`, err);
      await db.update(campaigns).set({ status: "FAILED", updatedAt: new Date() }).where(eq(campaigns.id, c.id));
    }
  }
  return results;
}
