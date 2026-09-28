import { pgTable, uuid, text, timestamp, pgEnum, integer, jsonb, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { contacts } from "./contacts";

// MVP automations are a linear sequence of steps rather than the full
// graph (automation_nodes/automation_edges) described in the original
// spec — branching/split-path logic is a V2 upgrade once there's a
// canvas-based builder. `automation_steps.order` gives the sequence;
// the engine walks it top to bottom per contact run.
export const automationStatus = pgEnum("automation_status", ["DRAFT", "ACTIVE", "PAUSED"]);

export const automationTriggerType = pgEnum("automation_trigger_type", [
  "CONTACT_CREATED",
  "TAG_ADDED",
]);

export const automations = pgTable(
  "automations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: automationStatus("status").default("DRAFT").notNull(),
    triggerType: automationTriggerType("trigger_type").notNull(),
    // e.g. { tagName: "VIP" } for TAG_ADDED; {} for CONTACT_CREATED
    triggerConfig: jsonb("trigger_config").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("automation_workspace_status_idx").on(table.workspaceId, table.status)]
);

export const automationStepType = pgEnum("automation_step_type", [
  "SEND_EMAIL",
  "WAIT",
  "ADD_TAG",
  "REMOVE_TAG",
]);

export type AutomationStepConfig =
  | { templateId: string }
  | { minutes: number }
  | { tagName: string };

export const automationSteps = pgTable(
  "automation_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    type: automationStepType("type").notNull(),
    config: jsonb("config").$type<AutomationStepConfig>().notNull().default({} as AutomationStepConfig),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("automation_step_automation_idx").on(table.automationId, table.order)]
);

export const automationRunStatus = pgEnum("automation_run_status", [
  "ACTIVE",
  "WAITING",
  "COMPLETED",
  "FAILED",
]);

export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    currentStepIndex: integer("current_step_index").default(0).notNull(),
    status: automationRunStatus("status").default("ACTIVE").notNull(),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("automation_run_status_idx").on(table.status, table.nextRunAt)]
);

export const automationEvents = pgTable("automation_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => automationRuns.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  type: text("type").notNull(), // "step_completed" | "run_completed" | "run_failed"
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
