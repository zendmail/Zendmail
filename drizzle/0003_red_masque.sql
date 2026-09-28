CREATE TYPE "public"."campaign_audience_type" AS ENUM('ALL', 'SEGMENT');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'PAUSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."recipient_status" AS ENUM('PENDING', 'SENT', 'SKIPPED_SUPPRESSED', 'SKIPPED_NO_CONSENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."template_category" AS ENUM('WELCOME', 'NEWSLETTER', 'PROMOTIONAL', 'ABANDONED_CART', 'POST_PURCHASE', 'WIN_BACK', 'PRODUCT_LAUNCH', 'SALE', 'THANK_YOU', 'CUSTOM');--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"status" "recipient_status" DEFAULT 'PENDING' NOT NULL,
	"sent_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"audience_type" "campaign_audience_type" DEFAULT 'ALL' NOT NULL,
	"segment_id" uuid,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"reply_to" text,
	"subject" text DEFAULT '' NOT NULL,
	"preview_text" text,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"template_id" uuid,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"name" text NOT NULL,
	"category" "template_category" DEFAULT 'CUSTOM' NOT NULL,
	"subject" text,
	"preview_text" text,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_recipient_unique" ON "campaign_recipients" USING btree ("campaign_id","contact_id");--> statement-breakpoint
CREATE INDEX "campaign_recipient_campaign_idx" ON "campaign_recipients" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "campaign_workspace_status_idx" ON "campaigns" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "campaign_workspace_created_idx" ON "campaigns" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "email_template_workspace_idx" ON "email_templates" USING btree ("workspace_id");