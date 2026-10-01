import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { segments } from "./segments";
import { contacts } from "./contacts";
import { sendingIdentities } from "./sending";

// A single content block within an email. Kept as a JSON shape rather
// than a normalized `email_blocks` table for the MVP builder — blocks
// are always read/written as a whole ordered array with their parent
// template or campaign, so there's no query pattern that needs them
// addressable as independent rows yet. Revisit if block-level history,
// reuse across templates, or partial updates become a requirement.
export type EmailBlock =
  | { id: string; type: "text"; html: string; color?: string }
  | { id: string; type: "heading"; text: string; color?: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "button"; label: string; url: string; backgroundColor?: string; textColor?: string }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; height: number }
  | { id: string; type: "footer"; text: string; color?: string };

export const templateCategory = pgEnum("template_category", [
  "WELCOME",
  "NEWSLETTER",
  "PROMOTIONAL",
  "ABANDONED_CART",
  "POST_PURCHASE",
  "WIN_BACK",
  "PRODUCT_LAUNCH",
  "SALE",
  "THANK_YOU",
  "CUSTOM",
]);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // null workspaceId = a built-in starter template available to everyone
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: templateCategory("category").default("CUSTOM").notNull(),
    subject: text("subject"),
    previewText: text("preview_text"),
    blocks: jsonb("blocks").$type<EmailBlock[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("email_template_workspace_idx").on(table.workspaceId)]
);

export const campaignStatus = pgEnum("campaign_status", [
  "DRAFT",
  "SCHEDULED",
  "SENDING",
  "SENT",
  "PAUSED",
  "FAILED",
]);

export const campaignAudienceType = pgEnum("campaign_audience_type", ["ALL", "SEGMENT"]);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    status: campaignStatus("status").default("DRAFT").notNull(),

    audienceType: campaignAudienceType("audience_type").default("ALL").notNull(),
    segmentId: uuid("segment_id").references(() => segments.id, { onDelete: "set null" }),

    fromName: text("from_name").notNull(),
    fromEmail: text("from_email").notNull(),
    replyTo: text("reply_to"),
    sendingIdentityId: uuid("sending_identity_id").references(() => sendingIdentities.id, { onDelete: "set null" }),
    subject: text("subject").notNull().default(""),
    previewText: text("preview_text"),

    // Snapshot of the block content at send time (or current draft state).
    // Editing the source template after a campaign is created must not
    // retroactively change what was already sent, so campaigns own their
    // own copy rather than referencing email_templates.blocks live.
    blocks: jsonb("blocks").$type<EmailBlock[]>().notNull().default([]),
    templateId: uuid("template_id").references(() => emailTemplates.id, { onDelete: "set null" }),

    recipientCount: integer("recipient_count").default(0).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("campaign_workspace_status_idx").on(table.workspaceId, table.status),
    index("campaign_workspace_created_idx").on(table.workspaceId, table.createdAt),
  ]
);

export const recipientStatus = pgEnum("recipient_status", [
  "PENDING",
  "SENT",
  "SKIPPED_SUPPRESSED",
  "SKIPPED_NO_CONSENT",
  "FAILED",
]);

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    status: recipientStatus("status").default("PENDING").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("campaign_recipient_unique").on(table.campaignId, table.contactId),
    index("campaign_recipient_campaign_idx").on(table.campaignId, table.status),
  ]
);
