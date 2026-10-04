import { pgTable, uuid, text, timestamp, pgEnum, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspace";

/**
 * Result of one authentication check. NOT_CHECKED means we have never
 * asked the provider / DNS — it must never be rendered as passing.
 */
export const authCheckStatus = pgEnum("auth_check_status", ["NOT_CHECKED", "PENDING", "PASSING", "FAILING"]);

/** One DNS record the user must publish, normalized across providers. */
export type DnsRecord = {
  type: "TXT" | "CNAME" | "MX";
  /** Host relative to the domain ("@" for the apex), as most DNS panels expect. */
  host: string;
  value: string;
  priority?: number;
  purpose: "OWNERSHIP" | "DKIM" | "SPF" | "RETURN_PATH";
  status: "NOT_CHECKED" | "PENDING" | "PASSING" | "FAILING";
};

// A domain a workspace wants to send from. Authentication state is stored
// per mechanism; "can this domain send?" is DERIVED (see sending/rules.ts)
// so the two can never disagree.
export const sendingDomains = pgTable(
  "sending_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(), // lower-case, no scheme/path
    provider: text("provider").notNull(), // e.g. "RESEND"
    providerDomainId: text("provider_domain_id"),
    ownershipToken: text("ownership_token").notNull(),
    ownershipStatus: authCheckStatus("ownership_status").default("NOT_CHECKED").notNull(),
    dkimStatus: authCheckStatus("dkim_status").default("NOT_CHECKED").notNull(),
    spfStatus: authCheckStatus("spf_status").default("NOT_CHECKED").notNull(),
    // Custom MAIL FROM / bounce domain. Kept separate from the visible From domain.
    returnPathStatus: authCheckStatus("return_path_status").default("NOT_CHECKED").notNull(),
    dmarcStatus: authCheckStatus("dmarc_status").default("NOT_CHECKED").notNull(),
    dmarcPolicy: text("dmarc_policy"), // "none" | "quarantine" | "reject" | null
    dnsRecords: jsonb("dns_records").$type<DnsRecord[]>().default([]).notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    lastError: text("last_error"),
    testEmailSentAt: timestamp("test_email_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sending_domain_workspace_domain_unique").on(table.workspaceId, table.domain),
    // Two workspaces may both *start* adding a domain, but only one can ever own it:
    // a squatter's unverified claim cannot block (or shadow) the real owner's verified one.
    uniqueIndex("sending_domain_verified_owner_unique")
      .on(table.domain)
      .where(sql`${table.ownershipStatus} = 'PASSING'`),
    index("sending_domain_workspace_idx").on(table.workspaceId),
  ]
);

// A From / Reply-To pair on a verified domain. Always owned by exactly one workspace.
export const sendingIdentities = pgTable(
  "sending_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => sendingDomains.id, { onDelete: "cascade" }),
    fromName: text("from_name").notNull(),
    fromEmail: text("from_email").notNull(), // lower-case
    replyTo: text("reply_to"),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sending_identity_workspace_email_unique").on(table.workspaceId, table.fromEmail),
    index("sending_identity_domain_idx").on(table.domainId),
  ]
);

export const sentMessageSource = pgEnum("sent_message_source", ["CAMPAIGN", "AUTOMATION", "TEST", "DOMAIN_TEST"]);
export const senderMode = pgEnum("sender_mode", ["WORKSPACE_DOMAIN", "ZENDMAIL_MANAGED"]);

// Ledger of every message handed to the provider. This is what lets a
// provider webhook (which only knows its own message id) be mapped back to
// exactly one workspace before anything is suppressed or counted.
export const sentMessages = pgTable(
  "sent_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id").notNull(),
    source: sentMessageSource("source").notNull(),
    senderMode: senderMode("sender_mode").notNull(),
    sendingDomainId: uuid("sending_domain_id").references(() => sendingDomains.id, { onDelete: "set null" }),
    toEmail: text("to_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sent_message_provider_id_unique").on(table.provider, table.providerMessageId),
    index("sent_message_workspace_idx").on(table.workspaceId, table.createdAt),
  ]
);

export const emailEventType = pgEnum("email_event_type", ["DELIVERED", "BOUNCED", "COMPLAINED"]);

// Delivery outcomes reported by the provider. The unique (provider, event id)
// pair makes webhook processing idempotent under provider retries.
export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sentMessageId: uuid("sent_message_id")
      .notNull()
      .references(() => sentMessages.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    type: emailEventType("type").notNull(),
    permanent: boolean("permanent"), // bounces only; null when the provider didn't say
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("email_event_provider_event_unique").on(table.provider, table.providerEventId),
    index("email_event_workspace_idx").on(table.workspaceId, table.type, table.occurredAt),
  ]
);
