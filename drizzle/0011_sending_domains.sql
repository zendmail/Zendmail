CREATE TYPE "public"."auth_check_status" AS ENUM('NOT_CHECKED', 'PENDING', 'PASSING', 'FAILING');--> statement-breakpoint
CREATE TYPE "public"."email_event_type" AS ENUM('DELIVERED', 'BOUNCED', 'COMPLAINED');--> statement-breakpoint
CREATE TYPE "public"."sender_mode" AS ENUM('WORKSPACE_DOMAIN', 'ZENDMAIL_MANAGED');--> statement-breakpoint
CREATE TYPE "public"."sent_message_source" AS ENUM('CAMPAIGN', 'AUTOMATION', 'TEST', 'DOMAIN_TEST');--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"sent_message_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"type" "email_event_type" NOT NULL,
	"permanent" boolean,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sending_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"provider" text NOT NULL,
	"provider_domain_id" text,
	"ownership_token" text NOT NULL,
	"ownership_status" "auth_check_status" DEFAULT 'NOT_CHECKED' NOT NULL,
	"dkim_status" "auth_check_status" DEFAULT 'NOT_CHECKED' NOT NULL,
	"spf_status" "auth_check_status" DEFAULT 'NOT_CHECKED' NOT NULL,
	"return_path_status" "auth_check_status" DEFAULT 'NOT_CHECKED' NOT NULL,
	"dmarc_status" "auth_check_status" DEFAULT 'NOT_CHECKED' NOT NULL,
	"dmarc_policy" text,
	"dns_records" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_checked_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"last_error" text,
	"test_email_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sending_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"domain_id" uuid NOT NULL,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"reply_to" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"source" "sent_message_source" NOT NULL,
	"sender_mode" "sender_mode" NOT NULL,
	"sending_domain_id" uuid,
	"to_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_sent_message_id_sent_messages_id_fk" FOREIGN KEY ("sent_message_id") REFERENCES "public"."sent_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sending_domains" ADD CONSTRAINT "sending_domains_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sending_identities" ADD CONSTRAINT "sending_identities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sending_identities" ADD CONSTRAINT "sending_identities_domain_id_sending_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."sending_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_messages" ADD CONSTRAINT "sent_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_messages" ADD CONSTRAINT "sent_messages_sending_domain_id_sending_domains_id_fk" FOREIGN KEY ("sending_domain_id") REFERENCES "public"."sending_domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_event_provider_event_unique" ON "email_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "email_event_workspace_idx" ON "email_events" USING btree ("workspace_id","type","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sending_domain_workspace_domain_unique" ON "sending_domains" USING btree ("workspace_id","domain");--> statement-breakpoint
CREATE UNIQUE INDEX "sending_domain_verified_owner_unique" ON "sending_domains" USING btree ("domain") WHERE "sending_domains"."ownership_status" = 'PASSING';--> statement-breakpoint
CREATE INDEX "sending_domain_workspace_idx" ON "sending_domains" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sending_identity_workspace_email_unique" ON "sending_identities" USING btree ("workspace_id","from_email");--> statement-breakpoint
CREATE INDEX "sending_identity_domain_idx" ON "sending_identities" USING btree ("domain_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sent_message_provider_id_unique" ON "sent_messages" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE INDEX "sent_message_workspace_idx" ON "sent_messages" USING btree ("workspace_id","created_at");