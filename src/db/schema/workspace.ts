import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
  jsonb,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const workspaceRole = pgEnum("workspace_role", ["OWNER", "ADMIN", "MEMBER"]);

export const onboardingStep = pgEnum("onboarding_step", [
  "BUSINESS_INFO",
  "USE_CASE",
  "CONNECT_STORE",
  "COMPLETE",
]);

export const businessUseCaseEnum = pgEnum("use_case", [
  "ECOMMERCE",
  "NEWSLETTER",
  "AGENCY",
  "SAAS",
  "OTHER",
]);

// Every business account. All customer-facing data (contacts, campaigns,
// stores, etc. — added in later modules) is scoped by workspace_id so
// tenants never see each other's data.
export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  website: text("website"),
  industry: text("industry"),
  country: text("country"),
  currency: text("currency").default("USD").notNull(),
  timezone: text("timezone").default("UTC").notNull(),
  useCase: businessUseCaseEnum("use_case"),
  onboardingStep: onboardingStep("onboarding_step").default("BUSINESS_INFO").notNull(),
  // Send Frequency Guard: the default cap on how many marketing emails
  // any one contact can receive per rolling 7-day window, counted
  // across ALL campaigns combined (not per-campaign — that's the gap
  // most platforms leave open, letting several campaigns individually
  // "within limits" collectively flood the same inbox). A contact-level
  // override (contacts.maxEmailsPerWeek) takes precedence when set.
  maxEmailsPerContactPerWeek: integer("max_emails_per_contact_per_week").default(3).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRole("role").default("OWNER").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("workspace_member_unique").on(table.workspaceId, table.userId)]
);

// The user's currently-active workspace, so a login can drop them back
// into the right tenant when they belong to more than one.
export const userActiveWorkspace = pgTable("user_active_workspace", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(), // "free" | "starter" | "growth" | "pro" | "enterprise"
  name: text("name").notNull(),
  priceMonthly: numeric("price_monthly", { precision: 10, scale: 2 }),
  stripePriceId: text("stripe_price_id"), // filled in once a real Stripe product/price exists
  contactLimit: integer("contact_limit"),
  emailSendLimit: integer("email_send_limit"),
  aiGenerationLimit: integer("ai_generation_limit"),
  connectedStoreLimit: integer("connected_store_limit"),
  features: jsonb("features").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptionStatus = pgEnum("subscription_status", [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .unique()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id),
  status: subscriptionStatus("status").default("TRIALING").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Idempotency ledger for Stripe webhooks — Stripe may retry delivery of
// the same event, so every handler checks this table before applying
// any side effect and records itself here in the same transaction.
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(), // the Stripe event id (evt_...)
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});
