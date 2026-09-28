CREATE TYPE "public"."consent_source" AS ENUM('SIGNUP_FORM', 'CHECKOUT', 'CSV_IMPORT', 'STORE_SYNC', 'MANUAL', 'API');--> statement-breakpoint
CREATE TYPE "public"."consent_status" AS ENUM('GRANTED', 'NOT_PROVIDED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('SUBSCRIBER', 'CUSTOMER', 'LEAD', 'VIP', 'INACTIVE', 'UNSUBSCRIBED', 'BOUNCED');--> statement-breakpoint
CREATE TYPE "public"."suppression_reason" AS ENUM('UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'MANUAL');--> statement-breakpoint
CREATE TABLE "contact_list_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_list_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"status" "contact_status" DEFAULT 'SUBSCRIBER' NOT NULL,
	"consent_status" "consent_status" DEFAULT 'NOT_PROVIDED' NOT NULL,
	"consent_source" "consent_source",
	"consented_at" timestamp with time zone,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"last_purchase_at" timestamp with time zone,
	"last_engaged_at" timestamp with time zone,
	"engagement_score" integer DEFAULT 0 NOT NULL,
	"country" text,
	"city" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "suppression_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"reason" "suppression_reason" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_list_members" ADD CONSTRAINT "contact_list_members_contact_list_id_contact_lists_id_fk" FOREIGN KEY ("contact_list_id") REFERENCES "public"."contact_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_list_members" ADD CONSTRAINT "contact_list_members_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_lists" ADD CONSTRAINT "contact_lists_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_entries" ADD CONSTRAINT "suppression_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_list_member_unique" ON "contact_list_members" USING btree ("contact_list_id","contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_list_workspace_name_unique" ON "contact_lists" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_tag_unique" ON "contact_tags" USING btree ("contact_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_workspace_email_unique" ON "contacts" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "contact_workspace_status_idx" ON "contacts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "contact_workspace_created_idx" ON "contacts" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "suppression_workspace_email_unique" ON "suppression_entries" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_workspace_name_unique" ON "tags" USING btree ("workspace_id","name");