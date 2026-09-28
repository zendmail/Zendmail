import "server-only";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  stores,
  digitalProducts,
  digitalPurchases,
  abandonedCheckouts,
  customerSubscriptions,
  contacts,
} from "@/db/schema";

export async function getWorkspaceStore(workspaceId: string) {
  const [store] = await db
    .select()
    .from(stores)
    .where(and(eq(stores.workspaceId, workspaceId), eq(stores.status, "CONNECTED")))
    .limit(1);
  return store ?? null;
}

/**
 * Every function below returns real rows or an honest empty result —
 * never a fabricated count or revenue figure. A workspace with no
 * connected store gets `hasStore: false` and empty lists; a connected
 * store with genuinely zero sales gets `hasStore: true` and empty
 * lists. The UI is responsible for telling those two apart ("connect a
 * store" vs "no sales yet"), never inventing a number to paper over
 * the difference.
 */
export async function listDigitalProducts(workspaceId: string) {
  const store = await getWorkspaceStore(workspaceId);

  const products = await db
    .select()
    .from(digitalProducts)
    .where(eq(digitalProducts.workspaceId, workspaceId))
    .orderBy(desc(digitalProducts.totalRevenue));

  return { hasStore: Boolean(store), store, products };
}

export async function getDigitalProductDetail(workspaceId: string, productId: string) {
  const [product] = await db
    .select()
    .from(digitalProducts)
    .where(and(eq(digitalProducts.id, productId), eq(digitalProducts.workspaceId, workspaceId)))
    .limit(1);

  if (!product) return null;

  const purchases = await db
    .select({
      id: digitalPurchases.id,
      amount: digitalPurchases.amount,
      status: digitalPurchases.status,
      accessStatus: digitalPurchases.accessStatus,
      purchasedAt: digitalPurchases.purchasedAt,
      contactEmail: contacts.email,
      contactName: contacts.firstName,
    })
    .from(digitalPurchases)
    .innerJoin(contacts, eq(digitalPurchases.contactId, contacts.id))
    .where(eq(digitalPurchases.productId, productId))
    .orderBy(desc(digitalPurchases.purchasedAt))
    .limit(50);

  const [unaccessedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(digitalPurchases)
    .where(
      and(
        eq(digitalPurchases.productId, productId),
        eq(digitalPurchases.status, "COMPLETED"),
        eq(digitalPurchases.accessStatus, "NOT_ACCESSED")
      )
    );

  return { product, purchases, unaccessedCount: unaccessedRow?.count ?? 0 };
}

export async function listAbandonedCheckouts(workspaceId: string) {
  const store = await getWorkspaceStore(workspaceId);

  const checkouts = await db
    .select({
      id: abandonedCheckouts.id,
      value: abandonedCheckouts.value,
      status: abandonedCheckouts.status,
      startedAt: abandonedCheckouts.startedAt,
      recoveryUrl: abandonedCheckouts.recoveryUrl,
      contactEmail: contacts.email,
      productName: digitalProducts.name,
    })
    .from(abandonedCheckouts)
    .leftJoin(contacts, eq(abandonedCheckouts.contactId, contacts.id))
    .leftJoin(digitalProducts, eq(abandonedCheckouts.productId, digitalProducts.id))
    .where(and(eq(abandonedCheckouts.workspaceId, workspaceId), eq(abandonedCheckouts.status, "ABANDONED")))
    .orderBy(desc(abandonedCheckouts.startedAt));

  // Only sum value when every row actually has one — a partial sum
  // presented as "potential recovery value" would understate reality
  // and imply precision that isn't there.
  const allHaveValue = checkouts.length > 0 && checkouts.every((c) => c.value !== null);
  const potentialRecoveryValue = allHaveValue ? checkouts.reduce((sum, c) => sum + Number(c.value), 0) : null;

  return { hasStore: Boolean(store), checkouts, potentialRecoveryValue };
}

export async function getDigitalCustomerSummary(workspaceId: string, contactId: string) {
  const purchases = await db
    .select({
      id: digitalPurchases.id,
      amount: digitalPurchases.amount,
      status: digitalPurchases.status,
      accessStatus: digitalPurchases.accessStatus,
      purchasedAt: digitalPurchases.purchasedAt,
      productName: digitalProducts.name,
      productId: digitalProducts.id,
    })
    .from(digitalPurchases)
    .innerJoin(digitalProducts, eq(digitalPurchases.productId, digitalProducts.id))
    .where(and(eq(digitalPurchases.workspaceId, workspaceId), eq(digitalPurchases.contactId, contactId)))
    .orderBy(desc(digitalPurchases.purchasedAt));

  const activeSubscriptions = await db
    .select({ id: customerSubscriptions.id, status: customerSubscriptions.status, productName: digitalProducts.name })
    .from(customerSubscriptions)
    .innerJoin(digitalProducts, eq(customerSubscriptions.productId, digitalProducts.id))
    .where(and(eq(customerSubscriptions.workspaceId, workspaceId), eq(customerSubscriptions.contactId, contactId)));

  const completed = purchases.filter((p) => p.status === "COMPLETED");
  const totalSpent = completed.reduce((sum, p) => sum + Number(p.amount), 0);

  return { purchases, subscriptions: activeSubscriptions, totalSpent, hasPurchases: purchases.length > 0 };
}

/**
 * Upsell candidates: contacts who bought `fromProductId` but not
 * `toProductId`. A real co-occurrence query, not an ML recommendation —
 * it only ever surfaces a count when both products have actual
 * purchase rows to compare, never a guess.
 */
export async function findUpsellOpportunity(workspaceId: string, fromProductId: string, toProductId: string) {
  const buyers = await db
    .select({ contactId: digitalPurchases.contactId })
    .from(digitalPurchases)
    .where(
      and(
        eq(digitalPurchases.workspaceId, workspaceId),
        eq(digitalPurchases.productId, fromProductId),
        eq(digitalPurchases.status, "COMPLETED")
      )
    );

  if (buyers.length === 0) return { eligibleCount: 0, contactIds: [] as string[] };

  const alreadyBought = await db
    .select({ contactId: digitalPurchases.contactId })
    .from(digitalPurchases)
    .where(and(eq(digitalPurchases.workspaceId, workspaceId), eq(digitalPurchases.productId, toProductId)));

  const alreadyBoughtSet = new Set(alreadyBought.map((r) => r.contactId));
  const eligible = buyers.map((b) => b.contactId).filter((id) => !alreadyBoughtSet.has(id));

  return { eligibleCount: eligible.length, contactIds: eligible };
}

export async function getSubscriptionsNeedingAttention(workspaceId: string) {
  const sevenDaysOut = new Date();
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  return db
    .select({
      id: customerSubscriptions.id,
      status: customerSubscriptions.status,
      currentPeriodEnd: customerSubscriptions.currentPeriodEnd,
      contactEmail: contacts.email,
      productName: digitalProducts.name,
    })
    .from(customerSubscriptions)
    .innerJoin(contacts, eq(customerSubscriptions.contactId, contacts.id))
    .innerJoin(digitalProducts, eq(customerSubscriptions.productId, digitalProducts.id))
    .where(
      and(
        eq(customerSubscriptions.workspaceId, workspaceId),
        sql`(${customerSubscriptions.status} = 'PAST_DUE' or (${customerSubscriptions.status} in ('ACTIVE','TRIALING') and ${customerSubscriptions.currentPeriodEnd} <= ${sevenDaysOut}))`
      )
    );
}
