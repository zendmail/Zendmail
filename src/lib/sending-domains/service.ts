import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sendingDomains } from "@/db/schema";
import { DomainProviderError, getDomainProvider, type ProviderDomain } from "./provider";
import { parseSendingDomain } from "./validation";

export const MAX_DOMAINS_PER_WORKSPACE = 5;

export type SendingDomain = typeof sendingDomains.$inferSelect;
export type ServiceResult<T = void> = { ok: true; value: T } | { ok: false; error: string };

export async function listSendingDomains(workspaceId: string) {
  return db.select().from(sendingDomains).where(eq(sendingDomains.workspaceId, workspaceId)).orderBy(asc(sendingDomains.createdAt));
}

/** Lower-case names of the domains this workspace may send from. Used on every send. */
export async function getVerifiedDomainNames(workspaceId: string): Promise<string[]> {
  const rows = await db
    .select({ domain: sendingDomains.domain })
    .from(sendingDomains)
    .where(and(eq(sendingDomains.workspaceId, workspaceId), eq(sendingDomains.status, "VERIFIED")));
  return rows.map((r) => r.domain);
}

function stateToColumns(state: ProviderDomain, previouslyVerifiedAt?: Date | null) {
  const now = new Date();
  return {
    providerDomainId: state.providerDomainId,
    status: state.status,
    statusNote: state.statusNote,
    records: state.records,
    lastCheckedAt: now,
    updatedAt: now,
    verifiedAt: state.status === "VERIFIED" ? (previouslyVerifiedAt ?? now) : null,
  };
}

export async function addSendingDomain(workspaceId: string, rawInput: string): Promise<ServiceResult<SendingDomain>> {
  const parsed = parseSendingDomain(rawInput);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { domain } = parsed;

  const existing = await listSendingDomains(workspaceId);
  if (existing.some((d) => d.domain === domain)) {
    return { ok: false, error: "This domain is already in your list." };
  }
  if (existing.length >= MAX_DOMAINS_PER_WORKSPACE) {
    return { ok: false, error: `You can connect up to ${MAX_DOMAINS_PER_WORKSPACE} domains per workspace.` };
  }

  // One domain, one workspace — otherwise two tenants could send as each other.
  const [claimed] = await db.select({ id: sendingDomains.id }).from(sendingDomains).where(eq(sendingDomains.domain, domain)).limit(1);
  if (claimed) {
    return { ok: false, error: "This domain is already connected to another workspace. If it's yours, contact support." };
  }

  const provider = getDomainProvider();
  let state: ProviderDomain;
  try {
    state = await provider.createDomain(domain);
  } catch (error) {
    return { ok: false, error: error instanceof DomainProviderError ? error.message : "We couldn't add this domain right now. Please try again." };
  }

  try {
    const [row] = await db
      .insert(sendingDomains)
      .values({ workspaceId, domain, provider: provider.name, ...stateToColumns(state) })
      .returning();
    return { ok: true, value: row };
  } catch {
    // Lost a race on the unique index — undo the provider-side domain so nothing is left dangling.
    await provider.deleteDomain(state.providerDomainId).catch(() => {});
    return { ok: false, error: "This domain is already connected to another workspace. If it's yours, contact support." };
  }
}

export async function verifySendingDomain(workspaceId: string, id: string): Promise<ServiceResult<SendingDomain>> {
  const [row] = await db
    .select()
    .from(sendingDomains)
    .where(and(eq(sendingDomains.id, id), eq(sendingDomains.workspaceId, workspaceId)))
    .limit(1);
  if (!row || !row.providerDomainId) return { ok: false, error: "Domain not found." };

  let state: ProviderDomain;
  try {
    state = await getDomainProvider().verifyDomain(row.providerDomainId);
  } catch (error) {
    return { ok: false, error: error instanceof DomainProviderError ? error.message : "We couldn't check this domain right now. Please try again." };
  }

  const [updated] = await db
    .update(sendingDomains)
    .set(stateToColumns(state, row.verifiedAt))
    .where(eq(sendingDomains.id, row.id))
    .returning();
  return { ok: true, value: updated };
}

export async function removeSendingDomain(workspaceId: string, id: string): Promise<ServiceResult<{ domain: string }>> {
  const [row] = await db
    .select()
    .from(sendingDomains)
    .where(and(eq(sendingDomains.id, id), eq(sendingDomains.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return { ok: false, error: "Domain not found." };

  if (row.providerDomainId) {
    try {
      await getDomainProvider().deleteDomain(row.providerDomainId);
    } catch (error) {
      return { ok: false, error: error instanceof DomainProviderError ? error.message : "We couldn't remove this domain right now. Please try again." };
    }
  }
  await db.delete(sendingDomains).where(eq(sendingDomains.id, row.id));
  return { ok: true, value: { domain: row.domain } };
}
