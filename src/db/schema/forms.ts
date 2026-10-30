import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const signupFormStatus = pgEnum("signup_form_status", ["ACTIVE", "PAUSED"]);

/**
 * A public signup form. It is shown on a hosted page (/f/{publicId}) and can be embedded in any website with an iframe.
 * `publicId` is a random, unguessable id, so the workspace id never appears in a public URL.
 */
export const signupForms = pgTable(
  "signup_forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull(),
    name: text("name").notNull(),
    status: signupFormStatus("status").default("ACTIVE").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    buttonLabel: text("button_label").notNull().default("Subscribe"),
    successMessage: text("success_message").notNull().default(""),
    collectName: boolean("collect_name").default(true).notNull(),
    // The exact consent wording shown next to the button; it is what the person agrees to, so it is stored on the signup.
    consentText: text("consent_text").notNull(),
    // Double opt-in: the contact is only created (and welcomed) after they click the link we email them.
    doubleOptIn: boolean("double_opt_in").default(true).notNull(),
    accentColor: text("accent_color").notNull().default("#0B5FFF"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("signup_form_public_id_idx").on(table.publicId),
    index("signup_form_workspace_idx").on(table.workspaceId),
  ]
);

/** A signup waiting for the person to confirm their email. Only a hash of the token is stored. */
export const signupConfirmations = pgTable(
  "signup_confirmations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id").notNull().references(() => signupForms.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    firstName: text("first_name"),
    consentText: text("consent_text").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("signup_confirmation_token_idx").on(table.tokenHash),
    index("signup_confirmation_form_idx").on(table.formId, table.confirmedAt),
  ]
);
