import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { abandonedCheckouts, contacts, digitalProducts, storeOrders, stores, workspaces } from "@/db/schema";
import { classifyStore, type ProfileInputs, type StoreProfile } from "./profile";

/** Reads the workspace's real data and classifies it. Read-only. */
export async function loadStoreProfile(workspaceId: string): Promise<StoreProfile> {
  const now = Date.now();
  const d90 = new Date(now - 90 * 86_400_000);
  const d30 = new Date(now - 30 * 86_400_000);

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const [store] = await db.select({ businessModel: stores.businessModel }).from(stores).where(eq(stores.workspaceId, workspaceId)).limit(1);
  const products = await db.select().from(digitalProducts).where(eq(digitalProducts.workspaceId, workspaceId)).limit(300);

  const sendable = sql`${contacts.status} not in ('UNSUBSCRIBED','BOUNCED') and ${contacts.consentStatus} = 'GRANTED'`;
  const [c] = await db
    .select({
      total: sql<number>`count(*)::int`,
      subscribed: sql<number>`count(*) filter (where ${sendable})::int`,
      customers: sql<number>`count(*) filter (where ${contacts.totalOrders} > 0)::int`,
      lapsed: sql<number>`count(*) filter (where ${sendable} and ${contacts.totalOrders} > 0 and ${contacts.lastPurchaseAt} < ${d90})::int`,
      neverPurchased: sql<number>`count(*) filter (where ${sendable} and ${contacts.lastPurchaseAt} is null)::int`,
      p90: sql<number | null>`percentile_cont(0.9) within group (order by ${contacts.totalSpent}) filter (where ${contacts.totalOrders} > 0)`,
    })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, workspaceId), sql`${contacts.deletedAt} is null`));

  const vipThreshold = Math.max(50, Math.round(Number(c?.p90 ?? 0) / 10) * 10);
  const [vip] = await db
    .select({ n: sql<number>`count(*) filter (where ${sendable} and ${contacts.totalSpent} > ${vipThreshold})::int` })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, workspaceId), sql`${contacts.deletedAt} is null`));

  const [orders] = await db.select({ n: sql<number>`count(*)::int` }).from(storeOrders).where(and(eq(storeOrders.workspaceId, workspaceId), gte(storeOrders.placedAt, d90)));
  const [carts] = await db.select({ n: sql<number>`count(*)::int` }).from(abandonedCheckouts).where(and(eq(abandonedCheckouts.workspaceId, workspaceId), eq(abandonedCheckouts.status, "ABANDONED"), gte(abandonedCheckouts.startedAt, d30)));

  const inputs: ProfileInputs = {
    storeBusinessModel: store?.businessModel ?? null,
    useCase: workspace.useCase,
    industry: workspace.industry,
    products: products.map((p) => ({ name: p.name, type: p.type, price: p.price === null ? null : Number(p.price), imageUrl: p.imageUrl, productUrl: p.productUrl, totalSales: p.totalSales })),
    contacts: { total: c?.total ?? 0, subscribed: c?.subscribed ?? 0, customers: c?.customers ?? 0, lapsed: c?.lapsed ?? 0, neverPurchased: c?.neverPurchased ?? 0, highSpenders: vip?.n ?? 0, vipThreshold },
    orders90d: orders?.n ?? 0,
    abandonedCheckouts30d: carts?.n ?? 0,
    workspace: { name: workspace.name, logoUrl: workspace.logoUrl, website: workspace.website, currency: workspace.currency, country: workspace.country },
  };
  return classifyStore(inputs);
}
