import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const contactStatus = pgEnum("contact_status", [
  "SUBSCRIBER",
  "CUSTOMER",
  "LEAD",
  "VIP",
  "INACTIVE",
  "UNSUBSCRIBED",
  "BOUNCED",
]);

export const consentStatus = pgEnum("consent_status", [
  "GRANTED",
  "NOT_PROVIDED",
  "WITHDRAWN",
]);

export const consentSource = pgEnum("consent_source", [
  "SIGNUP_FORM",
  "CHECKOUT",
  "CSV_IMPORT",
  "STORE_SYNC",
  "MANUAL",
  "API",
]);

// The core CRM record. Every row is scoped to exactly one workspace —
// application code must always filter by workspaceId, and every query
// helper in src/lib/contacts.ts takes it as a required first argument
// rather than an optional filter, so tenant isolation can't be forgotten.
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),

    status: contactStatus("status").default("SUBSCRIBER").notNull(),

    // Consent — required to gate marketing sends. Populated at signup,
    // CSV import, or store sync; never silently defaulted to GRANTED.
    consentStatus: consentStatus("consent_status").default("NOT_PROVIDED").notNull(),
    consentSource: consentSource("consent_source"),
    consentedAt: timestamp("consented_at", { withTimezone: true }),

    // Denormalized commerce + engagement stats. These will be recomputed
    // by background jobs once the orders/email_events tables exist
    // (module 11/18); for now they default to zero for CSV-imported
    // and manually-created contacts.
    totalOrders: integer("total_orders").default(0).notNull(),
    totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).default("0").notNull(),
    lastPurchaseAt: timestamp("last_purchase_at", { withTimezone: true }),
    lastEngagedAt: timestamp("last_engaged_at", { withTimezone: true }),
    engagementScore: integer("engagement_score").default(0).notNull(),

    country: text("country"),
    city: text("city"),

    source: text("source"), // "manual" | "csv_import" | "shopify" | "form:{id}" ...

    // Smart Unsubscribe: instead of a binary subscribed/unsubscribed,
    // a contact can ask for less instead of leaving entirely. When set,
    // these override the workspace-wide send-frequency cap for this
    // contact specifically (see workspaces.maxEmailsPerContactPerWeek
    // and resolveSendableAudience in lib/campaigns.ts).
    maxEmailsPerWeek: integer("max_emails_per_week"), // null = use workspace default
    pausedUntil: timestamp("paused_until", { withTimezone: true }), // null = not paused

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("contact_workspace_email_unique").on(table.workspaceId, table.email),
    index("contact_workspace_status_idx").on(table.workspaceId, table.status),
    index("contact_workspace_created_idx").on(table.workspaceId, table.createdAt),
  ]
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("gray").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("tag_workspace_name_unique").on(table.workspaceId, table.name)]
);

export const contactTags = pgTable(
  "contact_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("contact_tag_unique").on(table.contactId, table.tagId)]
);

export const contactLists = pgTable(
  "contact_lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("contact_list_workspace_name_unique").on(table.workspaceId, table.name)]
);

export const contactListMembers = pgTable(
  "contact_list_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactListId: uuid("contact_list_id")
      .notNull()
      .references(() => contactLists.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("contact_list_member_unique").on(table.contactListId, table.contactId)]
);

export const suppressionReason = pgEnum("suppression_reason", [
  "UNSUBSCRIBED",
  "BOUNCED",
  "COMPLAINED",
  "MANUAL",
]);

// A workspace-wide do-not-send list, checked before every campaign or
// automation send regardless of a contact's list/segment membership.
export const suppressionEntries = pgTable(
  "suppression_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    reason: suppressionReason("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("suppression_workspace_email_unique").on(table.workspaceId, table.email)]
);
