CREATE TYPE "public"."access_status" AS ENUM('NOT_ACCESSED', 'ACCESSED_ONCE', 'ACCESSED_MULTIPLE');--> statement-breakpoint
CREATE TYPE "public"."business_model" AS ENUM('PHYSICAL', 'DIGITAL', 'SUBSCRIPTION', 'MIXED');--> statement-breakpoint
CREATE TYPE "public"."checkout_status" AS ENUM('ABANDONED', 'RECOVERED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."digital_product_type" AS ENUM('EBOOK', 'COURSE', 'TEMPLATE', 'SOFTWARE', 'MEMBERSHIP', 'SUBSCRIPTION', 'BUNDLE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('COMPLETED', 'REFUNDED', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."store_provider" AS ENUM('SHOPIFY', 'WOOCOMMERCE', 'GUMROAD', 'TEACHABLE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."store_status" AS ENUM('CONNECTED', 'DISCONNECTED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."subscription_commerce_status" AS ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'CHURNED');--> statement-breakpoint
CREATE TABLE "abandoned_checkouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"contact_id" uuid,
	"product_id" uuid,
	"value" numeric(10, 2),
	"recovery_url" text,
	"status" "checkout_status" DEFAULT 'ABANDONED' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"recovered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"status" "subscription_commerce_status" NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"store_id" uuid,
	"external_id" text,
	"name" text NOT NULL,
	"type" "digital_product_type" DEFAULT 'OTHER' NOT NULL,
	"price" numeric(10, 2),
	"total_sales" integer,
	"total_revenue" numeric(12, 2),
	"refund_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "purchase_status" DEFAULT 'COMPLETED' NOT NULL,
	"access_status" "access_status",
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" "store_provider" NOT NULL,
	"business_model" "business_model",
	"status" "store_status" DEFAULT 'DISCONNECTED' NOT NULL,
	"encrypted_credentials" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abandoned_checkouts" ADD CONSTRAINT "abandoned_checkouts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_checkouts" ADD CONSTRAINT "abandoned_checkouts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_checkouts" ADD CONSTRAINT "abandoned_checkouts_product_id_digital_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."digital_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_product_id_digital_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."digital_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_products" ADD CONSTRAINT "digital_products_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_products" ADD CONSTRAINT "digital_products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_purchases" ADD CONSTRAINT "digital_purchases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_purchases" ADD CONSTRAINT "digital_purchases_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_purchases" ADD CONSTRAINT "digital_purchases_product_id_digital_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."digital_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abandoned_checkout_workspace_idx" ON "abandoned_checkouts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "customer_subscription_workspace_idx" ON "customer_subscriptions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "digital_product_workspace_idx" ON "digital_products" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "digital_purchase_workspace_idx" ON "digital_purchases" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "digital_purchase_contact_idx" ON "digital_purchases" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "digital_purchase_product_idx" ON "digital_purchases" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "store_workspace_idx" ON "stores" USING btree ("workspace_id");