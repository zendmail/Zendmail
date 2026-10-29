import { pgTable, uuid, text, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import type { EmailBlock, EmailTheme } from "./campaigns";

export const autopilotStatus = pgEnum("autopilot_status", ["PROPOSED", "APPROVED", "DISMISSED"]);
export const autopilotKind = pgEnum("autopilot_kind", ["CAMPAIGN", "WELCOME_FLOW"]);

/**
 * An email Autopilot has prepared for the workspace to review. Nothing here is ever sent: approving one creates a
 * normal DRAFT campaign (or a paused welcome automation) that still goes through the usual review and pre-send checks.
 */
export const autopilotProposals = pgTable(
  "autopilot_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    kind: autopilotKind("kind").notNull(),
    status: autopilotStatus("status").default("PROPOSED").notNull(),
    title: text("title").notNull(),
    goal: text("goal").notNull(),
    why: text("why").notNull(),
    timing: text("timing").notNull(),
    audience: jsonb("audience").$type<Record<string, unknown>>().notNull(),
    templateKey: text("template_key").notNull(),
    copySource: text("copy_source").notNull(), // "AI" | "FALLBACK"
    subject: text("subject").notNull(),
    previewText: text("preview_text").notNull().default(""),
    blocks: jsonb("blocks").$type<EmailBlock[]>().notNull().default([]),
    theme: jsonb("theme").$type<EmailTheme | null>(),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [index("autopilot_proposal_workspace_idx").on(table.workspaceId, table.status)]
);
