ALTER TABLE "digital_products" ADD COLUMN "image_url" text;--> statement-breakpoint
-- One-time backfill: clear the incremental-sync watermark so the next sync re-reads every
-- product (and picks up its image). Upserts are idempotent, so this only refreshes existing rows.
UPDATE "stores" SET "last_synced_at" = NULL;
