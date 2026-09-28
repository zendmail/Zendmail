import { pgTable, uuid, text, timestamp, pgEnum, integer, numeric, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspace";
import { contacts } from "./contacts";

// A workspace's connected store, and what kind of business it runs.
// Nothing populates this yet — no OAuth integration exists in this
// environment — but every downstream table (products, checkouts,
// subscriptions) references storeId so real sync code has somewhere
// to write to without a schema change later.
export const businessModel = pgEnum("business_model", ["PHYSICAL", "DIGITAL", "SUBSCRIPTION", "MIXED"]);
export const storeProvider = pgEnum("store_provider", ["SHOPIFY", "WOOCOMMERCE", "GUMROAD", "TEACHABLE", "OTHER"]);
export const storeStatus = pgEnum("store_status", ["CONNECTED", "DISCONNECTED", "ERROR"]);

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: storeProvider("provider").notNull(),
    businessModel: businessModel("business_model"), // null until detected from real synced data
    status: storeStatus("status").default("DISCONNECTED").notNull(),
    // Encrypted at rest by whatever real integration writes here —
    // never stored or logged in plaintext once a real OAuth flow exists.
    encryptedCredentials: text("encrypted_credentials"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("store_workspace_idx").on(table.workspaceId)]
);

export const digitalProductType = pgEnum("digital_product_type", [
  "EBOOK",
  "COURSE",
  "TEMPLATE",
  "SOFTWARE",
  "MEMBERSHIP",
  "SUBSCRIPTION",
  "BUNDLE",
  "OTHER",
]);

export const digitalProducts = pgTable(
  "digital_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    externalId: text("external_id"), // the ID in the source platform, for re-sync matching
    name: text("name").notNull(),
    type: digitalProductType("type").default("OTHER").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }),
    // Denormalized rollups, recomputed by a real sync job — never
    // hand-edited, and left null (not zero) until a sync has actually
    // run, so the UI can tell "zero sales" apart from "never synced".
    totalSales: integer("total_sales"),
    totalRevenue: numeric("total_revenue", { precision: 12, scale: 2 }),
    refundCount: integer("refund_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("digital_product_workspace_idx").on(table.workspaceId),
    uniqueIndex("digital_product_store_external_unique").on(table.storeId, table.externalId),
  ]
);

export type StoreOrderLineItem = {
  productExternalId: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  total: number;
};

export const storeOrders = pgTable(
  "store_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    orderNumber: text("order_number").notNull(),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    financialStatus: text("financial_status").notNull(),
    fulfillmentStatus: text("fulfillment_status"),
    currency: text("currency").notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    lineItems: jsonb("line_items").$type<StoreOrderLineItem[]>().notNull().default([]),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("store_order_external_unique").on(table.storeId, table.externalId),
    index("store_order_workspace_placed_idx").on(table.workspaceId, table.placedAt),
    index("store_order_store_updated_idx").on(table.storeId, table.sourceUpdatedAt),
  ]
);

export const storeSyncStatus = pgEnum("store_sync_status", ["PENDING", "RUNNING", "COMPLETED", "FAILED"]);
export const storeSyncPhase = pgEnum("store_sync_phase", ["PRODUCTS", "ORDERS"]);
export const storeSyncRange = pgEnum("store_sync_range", ["LAST_30_DAYS", "LAST_90_DAYS", "ALL_HISTORY"]);

export const storeSyncJobs = pgTable(
  "store_sync_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    requestedRange: storeSyncRange("requested_range").notNull(),
    rangeStartedAt: timestamp("range_started_at", { withTimezone: true }),
    status: storeSyncStatus("status").default("PENDING").notNull(),
    phase: storeSyncPhase("phase").default("PRODUCTS").notNull(),
    cursor: text("cursor"),
    productsSynced: integer("products_synced").default(0).notNull(),
    ordersSynced: integer("orders_synced").default(0).notNull(),
    lastError: text("last_error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("store_sync_status_created_idx").on(table.status, table.createdAt),
    index("store_sync_store_status_idx").on(table.storeId, table.status),
    uniqueIndex("store_sync_one_active_per_store_unique")
      .on(table.storeId)
      .where(sql`${table.status} in ('PENDING', 'RUNNING')`),
  ]
);

export const purchaseStatus = pgEnum("purchase_status", ["COMPLETED", "REFUNDED", "DISPUTED"]);
export const accessStatus = pgEnum("access_status", ["NOT_ACCESSED", "ACCESSED_ONCE", "ACCESSED_MULTIPLE"]);

// One row per (contact, product) purchase — the join that everything
// in the digital customer lifecycle (upsell detection, download
// reminders, repeat-buyer segments) reads from.
export const digitalPurchases = pgTable(
  "digital_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => digitalProducts.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    status: purchaseStatus("status").default("COMPLETED").notNull(),
    // Download/access tracking only means something if the source
    // platform actually reports it (e.g. Teachable course progress).
    // Left null — not "NOT_ACCESSED" — when the platform simply
    // doesn't expose this, so the UI can say "not available through
    // this connection" instead of implying the customer never opened it.
    accessStatus: accessStatus("access_status"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("digital_purchase_workspace_idx").on(table.workspaceId),
    index("digital_purchase_contact_idx").on(table.contactId),
    index("digital_purchase_product_idx").on(table.productId),
  ]
);

export const checkoutStatus = pgEnum("checkout_status", ["ABANDONED", "RECOVERED", "EXPIRED"]);

export const abandonedCheckouts = pgTable(
  "abandoned_checkouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    productId: uuid("product_id").references(() => digitalProducts.id, { onDelete: "set null" }),
    value: numeric("value", { precision: 10, scale: 2 }),
    recoveryUrl: text("recovery_url"), // only set if the source platform provides one
    status: checkoutStatus("status").default("ABANDONED").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    recoveredAt: timestamp("recovered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("abandoned_checkout_workspace_idx").on(table.workspaceId, table.status)]
);

export const subscriptionCommerceStatus = pgEnum("subscription_commerce_status", [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "CHURNED",
]);

// A CUSTOMER's subscription to a digital product/membership — distinct
// from `subscriptions` in workspace.ts, which is the workspace's OWN
// billing plan with Zendmail. Naming kept explicit to avoid confusion
// between "a workspace pays Zendmail" and "a customer pays a workspace".
export const customerSubscriptions = pgTable(
  "customer_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => digitalProducts.id, { onDelete: "cascade" }),
    status: subscriptionCommerceStatus("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("customer_subscription_workspace_idx").on(table.workspaceId, table.status)]
);
