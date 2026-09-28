import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { workspaces } from "./workspace";

// Append-only log of security and account-relevant events. Populated from
// auth flows now; campaign/automation/admin actions will write here too
// as those modules are built.
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g. "auth.login", "auth.password_reset"
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
