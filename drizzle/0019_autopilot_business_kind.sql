ALTER TABLE "workspaces" ADD COLUMN "autopilot_business_kind" text;
--> statement-breakpoint
-- Products are now classified (digital / subscription / physical) during sync: clear the watermark so every product is re-read once.
UPDATE "stores" SET "last_synced_at" = NULL;
