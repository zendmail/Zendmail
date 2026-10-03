import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, sql, gte, desc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  sendingDomains,
  sendingIdentities,
  sentMessages,
  emailEvents,
  suppressionEntries,
  type DnsRecord,
} from "@/db/schema";
import { emailProvider } from "@/lib/email-provider";
import { checkOwnershipTxt, lookupDmarc, OWNERSHIP_HOST, ownershipRecordValue } from "./dns";
import {
  computeRates,
  domainOfEmail,
  isDomainSendable,
  normalizeDomain,
  normalizeEmail,
  type CheckStatus,
  type SenderCandidateIdentity,
} from "./rules";

export class SendingError extends Error {}

// ---------------------------------------------------------------------------
// Reads — every query is scoped by workspaceId; there is no unscoped lookup by id.
// ---------------------------------------------------------------------------

export async function listSendingDomains(workspaceId: string) {
  return db.select().from(sendingDomains).where(eq(sendingDomains.workspaceId, workspaceId)).orderBy(desc(sendingDomains.createdAt));
}

export async function getSendingDomain(workspaceId: string, domainId: string) {
  const [row] = await db
    .select()
    .from(sendingDomains)
    .where(and(eq(sendingDomains.id, domainId), eq(sendingDomains.workspaceId, workspaceId)))
    .limit(1);
  return row ?? null;
}

export async function listIdentities(workspaceId: string) {
  return db
    .select({ identity: sendingIdentities, domain: sendingDomains })
    .from(sendingIdentities)
    .innerJoin(sendingDomains, eq(sendingIdentities.domainId, sendingDomains.id))
    .where(and(eq(sendingIdentities.workspaceId, workspaceId), eq(sendingDomains.workspaceId, workspaceId)))
    .orderBy(desc(sendingIdentities.isDefault), sendingIdentities.fromEmail);
}

export async function listSenderCandidates(workspaceId: string): Promise<SenderCandidateIdentity[]> {
  const rows = await listIdentities(workspaceId);
  return rows.map(({ identity, domain }) => ({
    id: identity.id,
    workspaceId: identity.workspaceId,
    domainId: identity.domainId,
    fromName: identity.fromName,
    fromEmail: identity.fromEmail,
    replyTo: identity.replyTo,
    domain: {
      id: domain.id,
      workspaceId: domain.workspaceId,
      domain: domain.domain,
      ownershipStatus: domain.ownershipStatus,
      dkimStatus: domain.dkimStatus,
      spfStatus: domain.spfStatus,
      returnPathStatus: domain.returnPathStatus,
    },
  }));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export async function addSendingDomain(workspaceId: string, rawDomain: string) {
  const domain = normalizeDomain(rawDomain);
  if (!domain) throw new SendingError("Enter a domain you own, like learnwithahmed.com (free-mail domains aren't allowed).");

  const [existing] = await db
    .select({ id: sendingDomains.id })
    .from(sendingDomains)
    .where(and(eq(sendingDomains.workspaceId, workspaceId), eq(sendingDomains.domain, domain)))
    .limit(1);
  if (existing) throw new SendingError("This domain is already added to your workspace.");

  // Provider registration first: if it fails we store nothing, so there is never a local
  // row claiming a domain that the provider doesn't know about.
  const provided = await emailProvider.createDomain(domain);
  const token = randomBytes(18).toString("base64url");

  const [row] = await db
    .insert(sendingDomains)
    .values({
      workspaceId,
      domain,
      provider: emailProvider.name,
      providerDomainId: provided.providerDomainId,
      ownershipToken: token,
      dnsRecords: buildRecordList(token, provided.records),
      dkimStatus: "PENDING",
      spfStatus: "PENDING",
      returnPathStatus: provided.records.some((r) => r.purpose === "RETURN_PATH") ? "PENDING" : "NOT_CHECKED",
    })
    .returning();
  return row;
}

function buildRecordList(token: string, providerRecords: DnsRecord[]): DnsRecord[] {
  return [
    { type: "TXT", host: OWNERSHIP_HOST, value: ownershipRecordValue(token), purpose: "OWNERSHIP", status: "PENDING" },
    ...providerRecords,
  ];
}

function combine(records: DnsRecord[], purpose: DnsRecord["purpose"]): CheckStatus {
  const relevant = records.filter((r) => r.purpose === purpose);
  if (relevant.length === 0) return "NOT_CHECKED";
  if (relevant.every((r) => r.status === "PASSING")) return "PASSING";
  if (relevant.some((r) => r.status === "FAILING")) return "FAILING";
  return "PENDING";
}

/**
 * Re-checks DNS. Provider results decide DKIM/SPF/return-path; our own DNS lookups decide
 * the ownership TXT and DMARC. Nothing is marked passing unless a check actually passed.
 */
export async function verifySendingDomain(workspaceId: string, domainId: string) {
  const row = await getSendingDomain(workspaceId, domainId);
  if (!row) throw new SendingError("Domain not found.");

  let lastError: string | null = null;
  let providerRecords: DnsRecord[] = row.dnsRecords.filter((r) => r.purpose !== "OWNERSHIP");
  if (row.providerDomainId) {
    try {
      providerRecords = (await emailProvider.verifyDomain(row.providerDomainId)).records;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Could not reach the email provider.";
    }
  }

  const dkim = lastError ? row.dkimStatus : combine(providerRecords, "DKIM");
  const spf = lastError ? row.spfStatus : combine(providerRecords, "SPF");
  const returnPath = lastError ? row.returnPathStatus : combine(providerRecords, "RETURN_PATH");

  // Ownership: our TXT record, or the provider's DKIM record (which also proves DNS control).
  const txtFound = await checkOwnershipTxt(row.domain, row.ownershipToken);
  let ownership: CheckStatus = txtFound === true || dkim === "PASSING" ? "PASSING" : row.ownershipStatus === "PASSING" ? "PASSING" : "PENDING";
  if (txtFound === null && ownership !== "PASSING") ownership = row.ownershipStatus;

  const dmarcLookup = await lookupDmarc(row.domain);
  const dmarc: CheckStatus = dmarcLookup === null ? row.dmarcStatus : dmarcLookup.found ? "PASSING" : "FAILING";
  const dmarcPolicy = dmarcLookup === null ? row.dmarcPolicy : dmarcLookup.policy;

  const records = buildRecordList(row.ownershipToken, providerRecords).map((r) =>
    r.purpose === "OWNERSHIP" ? { ...r, status: (ownership === "PASSING" ? "PASSING" : "PENDING") as DnsRecord["status"] } : r
  );
  const now = new Date();
  const sendable = isDomainSendable({ ownershipStatus: ownership, dkimStatus: dkim, spfStatus: spf, returnPathStatus: returnPath });

  const apply = (ownershipStatus: CheckStatus, error: string | null) =>
    db
      .update(sendingDomains)
      .set({
        ownershipStatus,
        dkimStatus: dkim,
        spfStatus: spf,
        returnPathStatus: returnPath,
        dmarcStatus: dmarc,
        dmarcPolicy,
        dnsRecords: records,
        lastCheckedAt: now,
        verifiedAt: sendable && ownershipStatus === "PASSING" ? (row.verifiedAt ?? now) : null,
        lastError: error,
        updatedAt: now,
      })
      .where(and(eq(sendingDomains.id, row.id), eq(sendingDomains.workspaceId, workspaceId)));

  try {
    await apply(ownership, lastError);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // Another workspace already holds a verified claim on this domain.
    await apply("FAILING", "This domain is already verified by another workspace, so it can't be claimed here.");
  }
  return getSendingDomain(workspaceId, domainId);
}

export async function removeSendingDomain(workspaceId: string, domainId: string) {
  const row = await getSendingDomain(workspaceId, domainId);
  if (!row) throw new SendingError("Domain not found.");
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sendingIdentities)
    .where(and(eq(sendingIdentities.domainId, row.id), eq(sendingIdentities.workspaceId, workspaceId)));
  if (count > 0) throw new SendingError("Remove this domain's sending identities first.");

  if (row.providerDomainId) {
    try {
      await emailProvider.deleteDomain(row.providerDomainId);
    } catch (err) {
      throw new SendingError(err instanceof Error ? err.message : "Couldn't remove the domain from the email provider.");
    }
  }
  await db.delete(sendingDomains).where(and(eq(sendingDomains.id, row.id), eq(sendingDomains.workspaceId, workspaceId)));
}

export async function createSendingIdentity(
  workspaceId: string,
  input: { domainId: string; fromName: string; localPart: string; replyTo?: string | null }
) {
  const domain = await getSendingDomain(workspaceId, input.domainId); // ← scoped: foreign domain ids resolve to null
  if (!domain) throw new SendingError("Domain not found.");
  if (!isDomainSendable(domain)) throw new SendingError("Verify this domain's DNS before creating sending identities on it.");

  const fromEmail = normalizeEmail(`${input.localPart.trim()}@${domain.domain}`);
  if (!fromEmail) throw new SendingError("Enter a valid address name (the part before the @).");
  const fromName = input.fromName.replace(/[\r\n<>"]/g, "").trim();
  if (!fromName) throw new SendingError("Enter a sender name.");

  let replyTo: string | null = null;
  if (input.replyTo && input.replyTo.trim()) {
    replyTo = normalizeEmail(input.replyTo);
    if (!replyTo) throw new SendingError("The Reply-To address isn't valid.");
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sendingIdentities)
    .where(eq(sendingIdentities.workspaceId, workspaceId));

  try {
    const [row] = await db
      .insert(sendingIdentities)
      .values({ workspaceId, domainId: domain.id, fromName, fromEmail, replyTo, isDefault: count === 0 })
      .returning();
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SendingError("That sending address already exists.");
    throw err;
  }
}

export async function deleteSendingIdentity(workspaceId: string, identityId: string) {
  await db.delete(sendingIdentities).where(and(eq(sendingIdentities.id, identityId), eq(sendingIdentities.workspaceId, workspaceId)));
}

/** The identity to use when nothing more specific was chosen (automations, domain tests). */
export async function getDefaultSender(workspaceId: string) {
  const candidates = (await listSenderCandidates(workspaceId)).filter((c) => isDomainSendable(c.domain));
  const rows = await listIdentities(workspaceId);
  const defaultId = rows.find((r) => r.identity.isDefault)?.identity.id;
  return candidates.find((c) => c.id === defaultId) ?? candidates[0] ?? null;
}

export function domainOfSender(email: string) {
  return domainOfEmail(email);
}

// ---------------------------------------------------------------------------
// Health — computed only from messages and events we actually recorded.
// ---------------------------------------------------------------------------

export async function getSendingCounts(workspaceId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [{ sent }] = await db
    .select({ sent: sql<number>`count(*)::int` })
    .from(sentMessages)
    .where(and(eq(sentMessages.workspaceId, workspaceId), gte(sentMessages.createdAt, since), sql`${sentMessages.source} in ('CAMPAIGN','AUTOMATION')`));

  const eventRows = await db
    .select({ type: emailEvents.type, count: sql<number>`count(*)::int` })
    .from(emailEvents)
    .where(and(eq(emailEvents.workspaceId, workspaceId), gte(emailEvents.occurredAt, since)))
    .groupBy(emailEvents.type);
  const byType = Object.fromEntries(eventRows.map((r) => [r.type, r.count])) as Record<string, number>;

  const [{ unsubscribed }] = await db
    .select({ unsubscribed: sql<number>`count(*)::int` })
    .from(suppressionEntries)
    .where(and(eq(suppressionEntries.workspaceId, workspaceId), eq(suppressionEntries.reason, "UNSUBSCRIBED"), gte(suppressionEntries.createdAt, since)));

  const [{ suppressedTotal }] = await db
    .select({ suppressedTotal: sql<number>`count(*)::int` })
    .from(suppressionEntries)
    .where(eq(suppressionEntries.workspaceId, workspaceId));

  const [{ eventsEver }] = await db
    .select({ eventsEver: sql<number>`count(*)::int` })
    .from(emailEvents)
    .where(eq(emailEvents.workspaceId, workspaceId));

  return {
    counts: { sent, delivered: byType.DELIVERED ?? 0, bounced: byType.BOUNCED ?? 0, complained: byType.COMPLAINED ?? 0, unsubscribed },
    suppressedTotal,
    // False until at least one webhook event has arrived: without it, bounce/complaint rates are blind.
    webhookReceivingEvents: eventsEver > 0,
  };
}

export async function getSendingHealth(workspaceId: string) {
  const { counts, suppressedTotal, webhookReceivingEvents } = await getSendingCounts(workspaceId);
  return { counts, rates: computeRates(counts), suppressedTotal, webhookReceivingEvents };
}
