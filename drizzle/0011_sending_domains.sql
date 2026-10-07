CREATE TYPE "public"."sending_domain_status" AS ENUM('PENDING', 'VERIFIED', 'FAILED');--> statement-breakpoint
CREATE TABLE "sending_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"provider_domain_id" text,
	"status" "sending_domain_status" DEFAULT 'PENDING' NOT NULL,
	"records" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status_note" text,
	"verified_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sending_domains" ADD CONSTRAINT "sending_domains_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sending_domains_domain_key" ON "sending_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "sending_domains_workspace_idx" ON "sending_domains" USING btree ("workspace_id");