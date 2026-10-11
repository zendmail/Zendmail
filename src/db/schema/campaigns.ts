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

// A single content block within an email. Kept as a JSON shape rather
// than a normalized `email_blocks` table for the MVP builder — blocks
// are always read/written as a whole ordered array with their parent
// template or campaign, so there's no query pattern that needs them
// addressable as independent rows yet. Revisit if block-level history,
// reuse across templates, or partial updates become a requirement.
/** Colour value: "#RRGGBB" or a theme token such as "@primary" / "@accentSoft" (resolved when rendering). */
export type BlockColor = string;

export type EmailIconName =
  | "check" | "bolt" | "shield" | "heart" | "leaf" | "truck" | "gift" | "clock" | "sparkles" | "users"
  | "chart" | "mail" | "map-pin" | "calendar" | "lock" | "droplet" | "award" | "refresh" | "message"
  | "package" | "tag" | "percent" | "trophy" | "target" | "smile" | "phone" | "star" | "cart" | "file"
  | "settings" | "rocket" | "flask" | "home" | "brain" | "sun" | "moon" | "key" | "globe" | "x";

export type EmailCardItem = {
  /** Small icon shown above the title (used when there is no image). */
  icon?: EmailIconName;
  imageUrl?: string;
  imageAlt?: string;
  badge?: string;
  title: string;
  text?: string;
  price?: string;
  buttonLabel?: string;
  buttonUrl?: string;
};

export type EmailListItem = { icon?: EmailIconName; title: string; text?: string };
export type EmailTestimonialItem = { quote: string; name: string; role?: string; rating?: number };
export type EmailLinkItem = { label: string; url: string };
export type EmailSocialNetwork = "facebook" | "instagram" | "x" | "tiktok" | "youtube" | "linkedin";

// A single content block within an email. Kept as a JSON shape rather
// than a normalized `email_blocks` table: blocks are always read/written
// as a whole ordered array with their parent template or campaign.
//
// Section blocks (hero, cards, list, …) carry their own colours as BlockColor values, so a
// template can be re-themed by changing the campaign/template `theme` instead of every block.
export type EmailBlock =
  | { id: string; type: "text"; html: string; color?: string }
  | { id: string; type: "heading"; text: string; color?: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "button"; label: string; url: string; backgroundColor?: string; textColor?: string }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; height: number }
  | { id: string; type: "footer"; text: string; color?: string; bg?: BlockColor }
  | { id: string; type: "header"; brand: string; logoUrl?: string; links: EmailLinkItem[]; bg?: BlockColor; color?: BlockColor }
  | {
      id: string; type: "hero";
      eyebrow?: string; headline: string; text?: string;
      imageUrl?: string; imageAlt?: string; imagePosition?: "top" | "bottom";
      buttonLabel?: string; buttonUrl?: string;
      align?: "left" | "center"; bg?: BlockColor; color?: BlockColor; accent?: BlockColor;
    }
  | {
      id: string; type: "coupon";
      eyebrow?: string; headline: string; text?: string; code: string;
      buttonLabel?: string; buttonUrl?: string;
      bg?: BlockColor; color?: BlockColor; accent?: BlockColor;
    }
  | {
      id: string; type: "cards";
      heading?: string; subheading?: string; columns: 1 | 2 | 3; boxed?: boolean; items: EmailCardItem[];
      bg?: BlockColor; color?: BlockColor; accent?: BlockColor; cardBg?: BlockColor;
    }
  | {
      id: string; type: "list";
      heading?: string; subheading?: string; style: "icons" | "checks" | "numbers" | "bullets"; boxed?: boolean; items: EmailListItem[];
      bg?: BlockColor; color?: BlockColor; accent?: BlockColor; cardBg?: BlockColor;
    }
  | {
      id: string; type: "testimonials";
      heading?: string; items: EmailTestimonialItem[];
      bg?: BlockColor; color?: BlockColor; accent?: BlockColor; cardBg?: BlockColor; boxed?: boolean;
    }
  | {
      id: string; type: "split";
      imageUrl: string; imageAlt?: string; imageSide: "left" | "right";
      eyebrow?: string; headline: string; text?: string; buttonLabel?: string; buttonUrl?: string;
      bg?: BlockColor; color?: BlockColor; accent?: BlockColor;
    }
  | {
      id: string; type: "callout";
      icon?: EmailIconName; headline: string; text?: string; buttonLabel?: string; buttonUrl?: string;
      bg?: BlockColor; color?: BlockColor; accent?: BlockColor; sectionBg?: BlockColor;
    }
  | { id: string; type: "wave"; shape: "wave" | "curve" | "dip" | "slant" | "drip" | "scallop"; top: BlockColor; bottom: BlockColor; height?: number }
  | { id: string; type: "social"; links: { network: EmailSocialNetwork; url: string }[]; bg?: BlockColor; color?: BlockColor; iconBg?: BlockColor }
  | { id: string; type: "links"; links: EmailLinkItem[]; style: "inline" | "pills"; bg?: BlockColor; color?: BlockColor };

export type EmailBlockType = EmailBlock["type"];

export type EmailFontKey = "sans" | "modern" | "rounded" | "serif" | "editorial" | "display";

/** Brand palette + typography applied to a whole email. All fields are validated by parseTheme(). */
export type EmailTheme = {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  headingFont: EmailFontKey;
  bodyFont: EmailFontKey;
  button: "rounded" | "pill" | "square";
};

export const templateTier = pgEnum("template_tier", ["FREE", "PRO"]);

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
    // Stable identifier for built-in templates so seeds can update them in place (null for workspace templates).
    key: text("key"),
    name: text("name").notNull(),
    description: text("description"),
    category: templateCategory("category").default("CUSTOM").notNull(),
    // FREE templates are open to every workspace; PRO templates need a paid plan to use (anyone can preview).
    tier: templateTier("tier").default("FREE").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    subject: text("subject"),
    previewText: text("preview_text"),
    blocks: jsonb("blocks").$type<EmailBlock[]>().notNull().default([]),
    theme: jsonb("theme").$type<EmailTheme | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("email_template_workspace_idx").on(table.workspaceId),
    uniqueIndex("email_template_key_idx").on(table.key),
  ]
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
    subject: text("subject").notNull().default(""),
    previewText: text("preview_text"),

    // Snapshot of the block content at send time (or current draft state).
    // Editing the source template after a campaign is created must not
    // retroactively change what was already sent, so campaigns own their
    // own copy rather than referencing email_templates.blocks live.
    blocks: jsonb("blocks").$type<EmailBlock[]>().notNull().default([]),
    theme: jsonb("theme").$type<EmailTheme | null>(),
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
