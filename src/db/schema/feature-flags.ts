import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

// Platform-wide toggles an admin can flip without a deploy. Workspace-
// scoped overrides (per-tenant flags) aren't needed yet — add a
// workspace_id column here if that becomes a requirement.
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
