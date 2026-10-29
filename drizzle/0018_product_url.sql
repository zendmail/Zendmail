ALTER TABLE "digital_products" ADD COLUMN "product_url" text;
--> statement-breakpoint
-- One-time backfill: clear the incremental-sync watermark so the next sync re-reads every product and stores its page URL.
UPDATE "stores" SET "last_synced_at" = NULL;
