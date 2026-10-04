import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, workspaceMembers, sendingDomains } from "@/db/schema";
import { MANAGED_DOMAINS } from "@/lib/email";
import { countSendableAudience } from "@/lib/campaigns";
import { listSenderCandidates, getSendingHealth } from "./domains";
import { decideSender } from "./rules";
import { evaluatePreSend, type PreSendReport } from "./presend-rules";

type CampaignForCheck = typeof campaigns.$inferSelect;

/**
 * Gathers real data and runs the pure evaluator. `userId` is the person sending; omit it only for
 * the scheduler, which acts on behalf of whoever scheduled the campaign (already authorized then).
 */
export async function runPreSendChecks(workspaceId: string, campaign: CampaignForCheck, userId?: string): Promise<PreSendReport> {
  const [identities, audience, health, memberMaySend, domainRow, concurrent] = await Promise.all([
    listSenderCandidates(workspaceId),
    countSendableAudience(workspaceId, { audienceType: campaign.audienceType, segmentId: campaign.segmentId }),
    getSendingHealth(workspaceId),
    userId ? isWorkspaceMember(workspaceId, userId) : Promise.resolve(true),
    findDomainByEmail(workspaceId, campaign.fromEmail),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.workspaceId, workspaceId),
          ne(campaigns.id, campaign.id),
          sql`${campaigns.deletedAt} is null`,
          sql`(${campaigns.status} = 'SENDING' or (${campaigns.status} = 'SCHEDULED' and ${campaigns.scheduledAt} <= now() + interval '24 hours'))`
        )
      ),
  ]);

  const sender = decideSender({ workspaceId, fromEmail: campaign.fromEmail, identities, managedDomains: MANAGED_DOMAINS });

  return evaluatePreSend({
    sender,
    replyTo: campaign.replyTo,
    dmarc: domainRow ? { status: domainRow.dmarcStatus, policy: domainRow.dmarcPolicy } : null,
    audience: {
      sendableCount: audience.sendable.length,
      skippedNoConsent: audience.skippedNoConsent,
      skippedSuppressed: audience.skippedSuppressed,
      skippedPaused: audience.skippedPaused,
      skippedFrequencyCap: audience.skippedFrequencyCap,
    },
    // Without webhook events we are blind to bounces/complaints — that must read "unknown", not "0%".
    health: health.webhookReceivingEvents ? health.rates : { sufficient: false, sent: health.counts.sent },
    concurrentCampaigns: concurrent[0]?.count ?? 0,
    memberMaySend,
  });
}

async function isWorkspaceMember(workspaceId: string, userId: string) {
  const [row] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return Boolean(row);
}

async function findDomainByEmail(workspaceId: string, email: string) {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return null;
  const [row] = await db
    .select()
    .from(sendingDomains)
    .where(and(eq(sendingDomains.workspaceId, workspaceId), eq(sendingDomains.domain, domain)))
    .limit(1);
  return row ?? null;
}

export class PreSendBlockedError extends Error {
  constructor(readonly report: PreSendReport) {
    super(
      "Send blocked: " +
        report.blockers.map((b) => `${b.label} — ${b.detail}${b.resolution ? ` Fix: ${b.resolution}` : ""}`).join(" | ")
    );
    this.name = "PreSendBlockedError";
  }
}
