import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const verificationTokenType = pgEnum("verification_token_type", [
  "EMAIL_VERIFY",
  "PASSWORD_RESET",
]);

export const platformRole = pgEnum("platform_role", ["USER", "ADMIN"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  avatarUrl: text("avatar_url"),
  // Platform-level role (Zendmail staff), distinct from
  // workspace_members.role which governs access within a single tenant.
  role: platformRole("role").default("USER").notNull(),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Server-side session store. The session cookie only holds an opaque
// random token; the row here is the source of truth and can be revoked
// at any time (logout everywhere, password change, admin suspension).
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Single-use tokens for email verification and password reset flows.
export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  type: verificationTokenType("type").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
