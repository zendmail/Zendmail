CREATE TYPE "public"."store_sync_phase" AS ENUM('PRODUCTS', 'ORDERS');--> statement-breakpoint
CREATE TYPE "public"."store_sync_range" AS ENUM('LAST_30_DAYS', 'LAST_90_DAYS', 'ALL_HISTORY');--> statement-breakpoint
CREATE TYPE "public"."store_sync_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "store_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"order_number" text NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"financial_status" text NOT NULL,
	"fulfillment_status" text,
	"currency" text NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"placed_at" timestamp with time zone NOT NULL,
	"source_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"requested_range" "store_sync_range" NOT NULL,
	"status" "store_sync_status" DEFAULT 'PENDING' NOT NULL,
	"phase" "store_sync_phase" DEFAULT 'PRODUCTS' NOT NULL,
	"cursor" text,
	"products_synced" integer DEFAULT 0 NOT NULL,
	"orders_synced" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_sync_jobs" ADD CONSTRAINT "store_sync_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_sync_jobs" ADD CONSTRAINT "store_sync_jobs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_order_external_unique" ON "store_orders" USING btree ("store_id","external_id");--> statement-breakpoint
CREATE INDEX "store_order_workspace_placed_idx" ON "store_orders" USING btree ("workspace_id","placed_at");--> statement-breakpoint
CREATE INDEX "store_order_store_updated_idx" ON "store_orders" USING btree ("store_id","source_updated_at");--> statement-breakpoint
CREATE INDEX "store_sync_status_created_idx" ON "store_sync_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "store_sync_store_status_idx" ON "store_sync_jobs" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "store_sync_one_active_per_store_unique" ON "store_sync_jobs" USING btree ("store_id") WHERE "store_sync_jobs"."status" in ('PENDING', 'RUNNING');--> statement-breakpoint
CREATE UNIQUE INDEX "digital_product_store_external_unique" ON "digital_products" USING btree ("store_id","external_id");