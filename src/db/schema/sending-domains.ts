import { pgTable, pgEnum, uuid, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

/**
 * A domain a workspace has proven it owns (via DNS records) so campaigns can be sent
 * "from" addresses on it, e.g. news@theirbrand.com.
 *
 * PENDING  — added, DNS records not (yet) detected
 * VERIFIED — DNS verified; emails may be sent from this domain
 * FAILED   — the provider gave up detecting the DNS records; remove and re-add to retry
 */
export const sendingDomainStatus = pgEnum("sending_domain_status", ["PENDING", "VERIFIED", "FAILED"]);

export type DnsRecordPurpose = "SPF" | "DKIM" | "DMARC" | "RETURN_PATH" | "TRACKING" | "OTHER";

/** A DNS record the customer must create at their domain host. Provider-agnostic. */
export type DnsRecord = {
  purpose: DnsRecordPurpose;
  type: "TXT" | "MX" | "CNAME";
  /** Host/name as it should be entered at the DNS provider (relative to the domain). */
  name: string;
  value: string;
  priority?: number | null;
  ttl?: string | null;
  /** Provider-reported state of this specific record, when available. */
  status?: string | null;
};

export const sendingDomains = pgTable(
  "sending_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // Lower-case, e.g. "mail.theirbrand.com". Globally unique: one domain, one workspace —
    // otherwise two tenants could send as each other.
    domain: text("domain").notNull(),
    provider: text("provider").notNull().default("resend"),
    providerDomainId: text("provider_domain_id"),
    status: sendingDomainStatus("status").default("PENDING").notNull(),
    records: jsonb("records").$type<DnsRecord[]>().default([]).notNull(),
    // Human-readable note when status isn't VERIFIED (e.g. "Provider could not find the DNS records").
    statusNote: text("status_note"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("sending_domains_domain_key").on(t.domain),
    index("sending_domains_workspace_idx").on(t.workspaceId),
  ]
);
