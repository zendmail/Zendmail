import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const sendingDomainStatus = pgEnum("sending_domain_status", ["PENDING", "VERIFIED", "FAILED"]);
export const sendingAuthenticationStatus = pgEnum("sending_authentication_status", ["PENDING", "PASSING", "FAILED", "RECOMMENDED"]);

export const sendingDomains = pgTable(
  "sending_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    status: sendingDomainStatus("status").default("PENDING").notNull(),
    ownershipVerifiedAt: timestamp("ownership_verified_at", { withTimezone: true }),
    dkimStatus: sendingAuthenticationStatus("dkim_status").default("PENDING").notNull(),
    spfStatus: sendingAuthenticationStatus("spf_status").default("PENDING").notNull(),
    dmarcStatus: sendingAuthenticationStatus("dmarc_status").default("PENDING").notNull(),
    bounceDomain: text("bounce_domain"),
    mailFrom: text("mail_from"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("sending_domain_workspace_domain_unique").on(table.workspaceId, table.domain),
    index("sending_domain_workspace_idx").on(table.workspaceId, table.status),
  ]
);

export const sendingIdentityStatus = pgEnum("sending_identity_status", ["ACTIVE", "INACTIVE"]);

export const sendingIdentities = pgTable(
  "sending_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sendingDomainId: uuid("sending_domain_id")
      .notNull()
      .references(() => sendingDomains.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    fromEmail: text("from_email").notNull(),
    replyTo: text("reply_to"),
    status: sendingIdentityStatus("status").default("ACTIVE").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sending_identity_workspace_email_unique").on(table.workspaceId, table.fromEmail),
    index("sending_identity_workspace_idx").on(table.workspaceId, table.status),
  ]
);
