CREATE TYPE "public"."template_tier" AS ENUM('FREE', 'PRO');--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "theme" jsonb;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "tier" "template_tier" DEFAULT 'FREE' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "theme" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "email_template_key_idx" ON "email_templates" USING btree ("key");