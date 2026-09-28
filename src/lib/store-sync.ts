import "server-only";
import { and, asc, eq, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { digitalProducts, stores, storeOrders, storeSyncJobs, type StoreOrderLineItem } from "@/db/schema";
import { decryptStoreCredentials, encryptStoreCredentials, type StoreCredentials } from "@/lib/store-credentials";
import { refreshShopifyCredentials, shopifyApiVersion } from "@/lib/shopify-auth";
import { requestWooCommerceJson } from "@/lib/woocommerce-client";

const PAGE_SIZE = 50;
const MAX_JOBS_PER_TICK = 2;
const STALE_JOB_MS = 5 * 60 * 1000;

const shopifyProductResponseSchema = z.object({
  data: z.object({
    products: z.object({
      edges: z.array(z.object({
        cursor: z.string(),
        node: z.object({
          id: z.string(),
          title: z.string(),
          productType: z.string().nullable(),
          updatedAt: z.string(),
          variants: z.object({ edges: z.array(z.object({ node: z.object({ price: z.string() }) })) }),
        }),
      })),
      pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
    }),
  }),
  errors: z.array(z.unknown()).optional(),
});

const shopifyOrderResponseSchema = z.object({
  data: z.object({
    orders: z.object({
      edges: z.array(z.object({
        cursor: z.string(),
        node: z.object({
          id: z.string(),
          name: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
          displayFinancialStatus: z.string(),
          displayFulfillmentStatus: z.string().nullable(),
          totalPriceSet: z.object({ shopMoney: z.object({ amount: z.string(), currencyCode: z.string() }) }),
          customer: z.object({ displayName: z.string().nullable(), email: z.string().nullable() }).nullable(),
          lineItems: z.object({
            edges: z.array(z.object({
              node: z.object({
                title: z.string(),
                quantity: z.number().int().nonnegative(),
                sku: z.string().nullable(),
                originalTotalSet: z.object({ shopMoney: z.object({ amount: z.string() }) }),
                variant: z.object({ product: z.object({ id: z.string() }).nullable() }).nullable(),
              }),
            })),
          }),
        }),
      })),
      pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
    }),
  }),
  errors: z.array(z.unknown()).optional(),
});

const wooProductSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string().optional(),
  price: z.string().optional(),
  date_modified_gmt: z.string().nullable().optional(),
});

const wooOrderSchema = z.object({
  id: z.number().int(),
  number: z.union([z.string(), z.number()]),
  status: z.string(),
  currency: z.string(),
  total: z.string(),
  date_created_gmt: z.string().nullable().optional(),
  date_created: z.string().optional(),
  date_modified_gmt: z.string().nullable().optional(),
  billing: z.object({ first_name: z.string().optional(), last_name: z.string().optional(), email: z.string().optional() }).optional(),
  line_items: z.array(z.object({
    product_id: z.number().int().nullable().optional(),
    name: z.string(),
    sku: z.string().nullable().optional(),
    quantity: z.number().int().nonnegative(),
    total: z.string(),
  })).optional(),
});

const shopifyProductsQuery = `query ZendmailProducts($first: Int!, $after: String, $filter: String) {
  products(first: $first, after: $after, query: $filter, sortKey: UPDATED_AT) {
    edges { cursor node { id title productType updatedAt variants(first: 1) { edges { node { price } } } } }
    pageInfo { hasNextPage endCursor }
  }
}`;

const shopifyOrdersQuery = `query ZendmailOrders($first: Int!, $after: String, $filter: String) {
  orders(first: $first, after: $after, query: $filter, sortKey: UPDATED_AT) {
    edges {
      cursor
      node {
        id name createdAt updatedAt displayFinancialStatus displayFulfillmentStatus
        totalPriceSet { shopMoney { amount currencyCode } }
        customer { displayName email }
        lineItems(first: 100) {
          edges { node { title quantity sku originalTotalSet { shopMoney { amount } } variant { product { id } } } }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

function asAmount(value: string | undefined | null) {
  if (!value) return 0;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function asDate(value: string | null | undefined, fallback?: Date) {
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (fallback) return fallback;
  throw new Error("Store data contained an invalid timestamp.");
}

async function getShopifyCredentials(store: typeof stores.$inferSelect) {
  const stored = decryptStoreCredentials(store.encryptedCredentials ?? "");
  if (stored.provider !== "SHOPIFY") throw new Error("Store provider credentials do not match.");
  const fresh = await refreshShopifyCredentials(stored);
  if (fresh.accessToken !== stored.accessToken || fresh.refreshToken !== stored.refreshToken) {
    await db.update(stores)
      .set({ encryptedCredentials: encryptStoreCredentials(fresh) })
      .where(and(eq(stores.id, store.id), eq(stores.workspaceId, store.workspaceId)));
  }
  return fresh;
}

async function shopifyGraphql<T>(credentials: Extract<StoreCredentials, { provider: "SHOPIFY" }>, query: string, variables: Record<string, unknown>) {
  const response = await fetch(`https://${credentials.shopDomain}/admin/api/${shopifyApiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": credentials.accessToken,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (response.status === 429 || response.status >= 500) throw new Error("Shopify is temporarily unavailable.");
  if (!response.ok) throw new Error("Shopify rejected the sync request. Reconnect the store if access was revoked.");
  const payload = await response.json() as { errors?: unknown[] };
  if (payload.errors?.length) throw new Error("Shopify returned a GraphQL sync error.");
  return payload as T;
}

function setJobProgress(jobId: string, values: Partial<typeof storeSyncJobs.$inferInsert>) {
  return db.update(storeSyncJobs).set({ ...values, updatedAt: new Date() }).where(eq(storeSyncJobs.id, jobId));
}

async function upsertProducts(store: typeof stores.$inferSelect, rows: {
  externalId: string;
  name: string;
  price: number | null;
}[]) {
  if (rows.length === 0) return;
  const now = new Date();
  await db.insert(digitalProducts).values(rows.map((row) => ({
    workspaceId: store.workspaceId,
    storeId: store.id,
    externalId: row.externalId,
    name: row.name,
    type: "OTHER" as const,
    price: row.price === null ? null : row.price.toFixed(2),
    updatedAt: now,
  }))).onConflictDoUpdate({
    target: [digitalProducts.storeId, digitalProducts.externalId],
    set: {
      name: sql`excluded.name`,
      type: sql`excluded.type`,
      price: sql`excluded.price`,
      updatedAt: now,
    },
  });
}

async function upsertOrders(store: typeof stores.$inferSelect, rows: {
  externalId: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  financialStatus: string;
  fulfillmentStatus: string | null;
  currency: string;
  total: number;
  lineItems: StoreOrderLineItem[];
  placedAt: Date;
  sourceUpdatedAt: Date | null;
}[]) {
  if (rows.length === 0) return;
  const now = new Date();
  await db.insert(storeOrders).values(rows.map((row) => ({
    ...row,
    workspaceId: store.workspaceId,
    storeId: store.id,
    total: row.total.toFixed(2),
    updatedAt: now,
  }))).onConflictDoUpdate({
    target: [storeOrders.storeId, storeOrders.externalId],
    set: {
      orderNumber: sql`excluded.order_number`,
      customerName: sql`excluded.customer_name`,
      customerEmail: sql`excluded.customer_email`,
      financialStatus: sql`excluded.financial_status`,
      fulfillmentStatus: sql`excluded.fulfillment_status`,
      currency: sql`excluded.currency`,
      total: sql`excluded.total`,
      lineItems: sql`excluded.line_items`,
      placedAt: sql`excluded.placed_at`,
      sourceUpdatedAt: sql`excluded.source_updated_at`,
      updatedAt: now,
    },
  });
}

async function syncShopifyProducts(store: typeof stores.$inferSelect, job: typeof storeSyncJobs.$inferSelect) {
  const credentials = await getShopifyCredentials(store);
  const filter = store.lastSyncedAt ? `updated_at:>${store.lastSyncedAt.toISOString()}` : null;
  const payload = await shopifyGraphql<unknown>(credentials, shopifyProductsQuery, {
    first: PAGE_SIZE,
    after: job.cursor,
    filter,
  });
  const parsed = shopifyProductResponseSchema.parse(payload);
  const connection = parsed.data.products;
  await upsertProducts(store, connection.edges.map(({ node }) => ({
    externalId: node.id,
    name: node.title,
    price: node.variants.edges[0] ? asAmount(node.variants.edges[0].node.price) : null,
  })));

  const pageComplete = !connection.pageInfo.hasNextPage;
  if (pageComplete) {
    await setJobProgress(job.id, {
      phase: "ORDERS",
      cursor: null,
      productsSynced: job.productsSynced + connection.edges.length,
      status: "PENDING",
      lastError: null,
    });
  } else {
    await setJobProgress(job.id, {
      cursor: connection.pageInfo.endCursor,
      productsSynced: job.productsSynced + connection.edges.length,
      status: "PENDING",
      lastError: null,
    });
  }
}

async function syncShopifyOrders(store: typeof stores.$inferSelect, job: typeof storeSyncJobs.$inferSelect) {
  const credentials = await getShopifyCredentials(store);
  let orderFilter: string | null = null;
  if (job.requestedRange === "ALL_HISTORY" && store.lastSyncedAt) {
    orderFilter = `updated_at:>${new Date(store.lastSyncedAt.getTime() - 5 * 60 * 1000).toISOString()}`;
  } else {
    const rangeStart = job.rangeStartedAt;
    if (rangeStart) orderFilter = `created_at:>=${rangeStart.toISOString()}`;
  }

  const payload = await shopifyGraphql<unknown>(credentials, shopifyOrdersQuery, {
    first: PAGE_SIZE,
    after: job.cursor,
    filter: orderFilter,
  });
  const parsed = shopifyOrderResponseSchema.parse(payload);
  const connection = parsed.data.orders;
  const orders = connection.edges.map(({ node }) => ({
    externalId: node.id,
    orderNumber: node.name,
    customerName: node.customer?.displayName ?? null,
    customerEmail: node.customer?.email ?? null,
    financialStatus: node.displayFinancialStatus.toLowerCase(),
    fulfillmentStatus: node.displayFulfillmentStatus?.toLowerCase() ?? null,
    currency: node.totalPriceSet.shopMoney.currencyCode,
    total: asAmount(node.totalPriceSet.shopMoney.amount),
    lineItems: node.lineItems.edges.map(({ node: lineItem }) => ({
      productExternalId: lineItem.variant?.product?.id ?? null,
      name: lineItem.title,
      sku: lineItem.sku,
      quantity: lineItem.quantity,
      total: asAmount(lineItem.originalTotalSet.shopMoney.amount),
    })),
    placedAt: asDate(node.createdAt),
    sourceUpdatedAt: asDate(node.updatedAt),
  }));
  await upsertOrders(store, orders);

  if (connection.pageInfo.hasNextPage) {
    await setJobProgress(job.id, {
      cursor: connection.pageInfo.endCursor,
      ordersSynced: job.ordersSynced + orders.length,
      status: "PENDING",
      lastError: null,
    });
    return;
  }

  const completedAt = new Date();
  await db.transaction(async (tx) => {
    await tx.update(storeSyncJobs).set({
      status: "COMPLETED",
      cursor: null,
      ordersSynced: job.ordersSynced + orders.length,
      completedAt,
      updatedAt: completedAt,
      lastError: null,
    }).where(eq(storeSyncJobs.id, job.id));
    await tx.update(stores).set({ lastSyncedAt: completedAt }).where(and(eq(stores.id, store.id), eq(stores.workspaceId, store.workspaceId)));
  });
}

async function syncWooCommerceProducts(store: typeof stores.$inferSelect, job: typeof storeSyncJobs.$inferSelect, credentials: Extract<StoreCredentials, { provider: "WOOCOMMERCE" }>) {
  const page = Number(job.cursor ?? "1");
  const query: Record<string, string> = { per_page: String(PAGE_SIZE), page: String(page) };
  if (store.lastSyncedAt) query.modified_after = store.lastSyncedAt.toISOString();
  const response = await requestWooCommerceJson<unknown>(credentials, "products", query);
  const parsed = z.array(wooProductSchema).safeParse(response.data);
  if (!parsed.success) throw new Error("WooCommerce returned an invalid products page.");
  const products = parsed.data.map((product) => ({
    externalId: String(product.id),
    name: product.name,
    price: product.price ? asAmount(product.price) : null,
  }));
  await upsertProducts(store, products);

  const hasNextPage = page < response.totalPages;
  await setJobProgress(job.id, {
    phase: hasNextPage ? "PRODUCTS" : "ORDERS",
    cursor: hasNextPage ? String(page + 1) : null,
    productsSynced: job.productsSynced + products.length,
    status: "PENDING",
    lastError: null,
  });
}

async function syncWooCommerceOrders(store: typeof stores.$inferSelect, job: typeof storeSyncJobs.$inferSelect, credentials: Extract<StoreCredentials, { provider: "WOOCOMMERCE" }>) {
  const page = Number(job.cursor ?? "1");
  const query: Record<string, string> = { per_page: String(PAGE_SIZE), page: String(page) };
  if (job.requestedRange !== "ALL_HISTORY") {
    const rangeStart = job.rangeStartedAt;
    if (rangeStart) query.after = rangeStart.toISOString();
  } else if (store.lastSyncedAt) {
    query.modified_after = new Date(store.lastSyncedAt.getTime() - 5 * 60 * 1000).toISOString();
  }

  const response = await requestWooCommerceJson<unknown>(credentials, "orders", query);
  const parsed = z.array(wooOrderSchema).safeParse(response.data);
  if (!parsed.success) throw new Error("WooCommerce returned an invalid orders page.");
  const orders = parsed.data.map((order) => {
    const billingName = [order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(" ");
    return {
      externalId: String(order.id),
      orderNumber: String(order.number),
      customerName: billingName || null,
      customerEmail: order.billing?.email || null,
      financialStatus: order.status.toLowerCase(),
      fulfillmentStatus: order.status.toLowerCase(),
      currency: order.currency,
      total: asAmount(order.total),
      lineItems: (order.line_items ?? []).map((item) => ({
        productExternalId: item.product_id == null ? null : String(item.product_id),
        name: item.name,
        sku: item.sku ?? null,
        quantity: item.quantity,
        total: asAmount(item.total),
      })),
      placedAt: asDate(order.date_created_gmt || order.date_created),
      sourceUpdatedAt: order.date_modified_gmt ? asDate(order.date_modified_gmt) : null,
    };
  });
  await upsertOrders(store, orders);

  const hasNextPage = page < response.totalPages;
  if (hasNextPage) {
    await setJobProgress(job.id, {
      cursor: String(page + 1),
      ordersSynced: job.ordersSynced + orders.length,
      status: "PENDING",
      lastError: null,
    });
    return;
  }

  const completedAt = new Date();
  await db.transaction(async (tx) => {
    await tx.update(storeSyncJobs).set({
      status: "COMPLETED",
      cursor: null,
      ordersSynced: job.ordersSynced + orders.length,
      completedAt,
      updatedAt: completedAt,
      lastError: null,
    }).where(eq(storeSyncJobs.id, job.id));
    await tx.update(stores).set({ lastSyncedAt: completedAt }).where(and(eq(stores.id, store.id), eq(stores.workspaceId, store.workspaceId)));
  });
}

async function processJobPage(job: typeof storeSyncJobs.$inferSelect) {
  const [store] = await db.select().from(stores)
    .where(and(eq(stores.id, job.storeId), eq(stores.workspaceId, job.workspaceId), eq(stores.status, "CONNECTED")))
    .limit(1);
  if (!store?.encryptedCredentials) throw new Error("Store connection is no longer available.");

  const credentials = decryptStoreCredentials(store.encryptedCredentials);
  if (credentials.provider !== store.provider) throw new Error("Store provider credentials do not match.");

  if (credentials.provider === "SHOPIFY") {
    if (job.phase === "PRODUCTS") await syncShopifyProducts(store, job);
    else await syncShopifyOrders(store, job);
  } else if (credentials.provider === "WOOCOMMERCE") {
    if (job.phase === "PRODUCTS") await syncWooCommerceProducts(store, job, credentials);
    else await syncWooCommerceOrders(store, job, credentials);
  } else {
    throw new Error("Sync is not supported for this store provider.");
  }
}

async function claimNextJob() {
  const staleBefore = new Date(Date.now() - STALE_JOB_MS);
  const candidates = await db.select().from(storeSyncJobs)
    .where(or(eq(storeSyncJobs.status, "PENDING"), and(eq(storeSyncJobs.status, "RUNNING"), lt(storeSyncJobs.updatedAt, staleBefore))))
    .orderBy(asc(storeSyncJobs.createdAt))
    .limit(5);

  for (const candidate of candidates) {
    const claimCondition = candidate.status === "PENDING"
      ? and(eq(storeSyncJobs.id, candidate.id), eq(storeSyncJobs.status, "PENDING"))
      : and(eq(storeSyncJobs.id, candidate.id), eq(storeSyncJobs.status, "RUNNING"), lt(storeSyncJobs.updatedAt, staleBefore));
    const [claimed] = await db.update(storeSyncJobs)
      .set({ status: "RUNNING", startedAt: new Date(), updatedAt: new Date() })
      .where(claimCondition)
      .returning();
    if (claimed) return claimed;
  }
  return null;
}

export async function processStoreSyncJobs(maxJobs = MAX_JOBS_PER_TICK) {
  let processed = 0;
  for (let index = 0; index < maxJobs; index += 1) {
    const job = await claimNextJob();
    if (!job) break;
    try {
      await processJobPage(job);
    } catch {
      await setJobProgress(job.id, {
        status: "FAILED",
        lastError: "Store sync stopped. Check the connection and retry the sync.",
        updatedAt: new Date(),
      });
    }
    processed += 1;
  }
  return processed;
}