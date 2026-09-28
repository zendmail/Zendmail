import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const segmentMatchType = pgEnum("segment_match_type", ["ALL", "ANY"]); // ALL = AND, ANY = OR

// The set of fields the rule builder can filter on. Kept intentionally
// narrow for the MVP segmentation engine — this expands (product
// purchased, viewed product, campaign interaction, etc.) once the
// commerce and campaign-events tables exist.
export const segmentRuleField = pgEnum("segment_rule_field", [
  "STATUS",
  "TOTAL_SPENT",
  "TOTAL_ORDERS",
  "LAST_PURCHASE_AT",
  "COUNTRY",
  "HAS_TAG",
  "CONSENT_STATUS",
]);

export const segmentRuleOperator = pgEnum("segment_rule_operator", [
  "EQUALS",
  "NOT_EQUALS",
  "GREATER_THAN",
  "LESS_THAN",
  "BEFORE",
  "AFTER",
  "IS_NULL", // e.g. "never purchased"
  "IS_NOT_NULL",
]);

export const segments = pgTable(
  "segments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    matchType: segmentMatchType("match_type").default("ALL").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("segment_workspace_name_unique").on(table.workspaceId, table.name)]
);

export const segmentRules = pgTable("segment_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  segmentId: uuid("segment_id")
    .notNull()
    .references(() => segments.id, { onDelete: "cascade" }),
  field: segmentRuleField("field").notNull(),
  operator: segmentRuleOperator("operator").notNull(),
  value: text("value"), // stored as text, parsed per-field at query time
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
