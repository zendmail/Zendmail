import "server-only";
import { and, eq, ilike, or, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, contactTags, tags, campaignRecipients } from "@/db/schema";

export type ContactStatusFilter =
  | "ALL"
  | "SUBSCRIBER"
  | "CUSTOMER"
  | "LEAD"
  | "VIP"
  | "INACTIVE"
  | "UNSUBSCRIBED"
  | "BOUNCED";

export type ContactSort = "newest" | "oldest" | "name" | "total_spent";

const PAGE_SIZE = 25;

export async function listContacts(
  workspaceId: string,
  opts: {
    search?: string;
    status?: ContactStatusFilter;
    sort?: ContactSort;
    page?: number;
  } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const conditions = [eq(contacts.workspaceId, workspaceId), sql`${contacts.deletedAt} is null`];

  if (opts.search) {
    const term = `%${opts.search}%`;
    conditions.push(
      or(
        ilike(contacts.email, term),
        ilike(contacts.firstName, term),
        ilike(contacts.lastName, term)
      )!
    );
  }

  if (opts.status && opts.status !== "ALL") {
    conditions.push(eq(contacts.status, opts.status));
  }

  const orderBy =
    opts.sort === "oldest"
      ? asc(contacts.createdAt)
      : opts.sort === "name"
        ? asc(contacts.firstName)
        : opts.sort === "total_spent"
          ? desc(contacts.totalSpent)
          : desc(contacts.createdAt);

  const where = and(...conditions);

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(where)
      .orderBy(orderBy)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(contacts).where(where),
  ]);

  return { rows, total: count, page, pageSize: PAGE_SIZE, pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export async function getWorkspaceContactCounts(workspaceId: string) {
  const rows = await db
    .select({ status: contacts.status, count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, workspaceId), sql`${contacts.deletedAt} is null`))
    .groupBy(contacts.status);

  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return { total, byStatus: Object.fromEntries(rows.map((r) => [r.status, r.count])) };
}

export async function getContactById(workspaceId: string, contactId: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, workspaceId)))
    .limit(1);

  if (!contact) return null;

  const contactTagRows = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(eq(contactTags.contactId, contactId));

  const engagement = await getContactEngagement(contactId);

  return { ...contact, tags: contactTagRows, engagement };
}

/**
 * The schema has a stored `engagementScore` column, but nothing in the
 * codebase ever writes to it — it would always render as a fake "0/100"
 * for every contact. This computes a real score on demand from actual
 * send/open/click history instead: 70% weight on open rate, 30% on
 * click rate, out of however many campaigns this contact has actually
 * been sent. Returns null (not a fabricated 0) when the contact has no
 * send history yet, so the UI can show "Not enough data" honestly.
 */
export async function getContactEngagement(contactId: string) {
  const [row] = await db
    .select({
      sent: sql<number>`count(*)::int`,
      opened: sql<number>`count(*) filter (where ${campaignRecipients.openedAt} is not null)::int`,
      clicked: sql<number>`count(*) filter (where ${campaignRecipients.clickedAt} is not null)::int`,
    })
    .from(campaignRecipients)
    .where(and(eq(campaignRecipients.contactId, contactId), eq(campaignRecipients.status, "SENT")));

  if (!row || row.sent === 0) return null;

  const openRate = row.opened / row.sent;
  const clickRate = row.clicked / row.sent;
  const score = Math.round((openRate * 70 + clickRate * 30) * 100) / 100;

  return { score: Math.min(100, Math.round(score)), sent: row.sent, opened: row.opened, clicked: row.clicked };
}

export async function listWorkspaceTags(workspaceId: string) {
  return db.select().from(tags).where(eq(tags.workspaceId, workspaceId)).orderBy(asc(tags.name));
}

export async function findExistingEmails(workspaceId: string, emails: string[]) {
  if (emails.length === 0) return new Set<string>();
  const rows = await db
    .select({ email: contacts.email })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, workspaceId), inArray(contacts.email, emails)));
  return new Set(rows.map((r) => r.email));
}
