CREATE TYPE "public"."signup_form_status" AS ENUM('ACTIVE', 'PAUSED');--> statement-breakpoint
CREATE TABLE "signup_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"consent_text" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signup_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "signup_form_status" DEFAULT 'ACTIVE' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"button_label" text DEFAULT 'Subscribe' NOT NULL,
	"success_message" text DEFAULT '' NOT NULL,
	"collect_name" boolean DEFAULT true NOT NULL,
	"consent_text" text NOT NULL,
	"double_opt_in" boolean DEFAULT true NOT NULL,
	"accent_color" text DEFAULT '#0B5FFF' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signup_confirmations" ADD CONSTRAINT "signup_confirmations_form_id_signup_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."signup_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signup_confirmations" ADD CONSTRAINT "signup_confirmations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signup_forms" ADD CONSTRAINT "signup_forms_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "signup_confirmation_token_idx" ON "signup_confirmations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "signup_confirmation_form_idx" ON "signup_confirmations" USING btree ("form_id","confirmed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "signup_form_public_id_idx" ON "signup_forms" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "signup_form_workspace_idx" ON "signup_forms" USING btree ("workspace_id");