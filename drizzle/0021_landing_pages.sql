CREATE TYPE "public"."landing_page_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "landing_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "landing_page_status" DEFAULT 'DRAFT' NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"theme" jsonb,
	"form_id" uuid,
	"content_revision" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_form_id_signup_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."signup_forms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "landing_page_public_id_idx" ON "landing_pages" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "landing_page_workspace_idx" ON "landing_pages" USING btree ("workspace_id");