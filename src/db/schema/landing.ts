import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { signupForms } from "./forms";
import type { EmailBlock, EmailTheme } from "./campaigns";

export const landingPageStatus = pgEnum("landing_page_status", ["DRAFT", "PUBLISHED"]);

/**
 * A hosted landing page, built with the same block editor as emails and served at /p/{publicId}.
 * It can show one of the workspace's signup forms under the content, so visitors can subscribe with consent.
 */
export const landingPages = pgTable(
  "landing_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull(),
    name: text("name").notNull(),
    status: landingPageStatus("status").default("DRAFT").notNull(),
    // Browser tab title and search/social preview.
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    blocks: jsonb("blocks").$type<EmailBlock[]>().notNull().default([]),
    theme: jsonb("theme").$type<EmailTheme | null>(),
    // Optional signup form shown under the content. Cleared (not deleted) if the form is removed.
    formId: uuid("form_id").references(() => signupForms.id, { onDelete: "set null" }),
    contentRevision: integer("content_revision").default(0).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("landing_page_public_id_idx").on(table.publicId),
    index("landing_page_workspace_idx").on(table.workspaceId),
  ]
);
