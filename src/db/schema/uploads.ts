import { pgTable, uuid, text, integer, timestamp, index, customType } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/**
 * Images uploaded in the editors when no object storage (S3) is configured. The bytes live in the database and are
 * served from /api/uploads/images/{id}; the random id is the only thing that makes a URL reachable, exactly like an
 * object-storage link. Only validated JPEG, PNG, WebP and GIF files are ever stored.
 */
export const uploadedImages = pgTable(
  "uploaded_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("uploaded_image_workspace_idx").on(table.workspaceId)]
);
