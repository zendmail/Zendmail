CREATE TYPE "public"."automation_run_status" AS ENUM('ACTIVE', 'WAITING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."automation_status" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED');--> statement-breakpoint
CREATE TYPE "public"."automation_step_type" AS ENUM('SEND_EMAIL', 'WAIT', 'ADD_TAG', 'REMOVE_TAG');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger_type" AS ENUM('CONTACT_CREATED', 'TAG_ADDED');--> statement-breakpoint
CREATE TABLE "automation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_index" integer NOT NULL,
	"type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"status" "automation_run_status" DEFAULT 'ACTIVE' NOT NULL,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"type" "automation_step_type" NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "automation_status" DEFAULT 'DRAFT' NOT NULL,
	"trigger_type" "automation_trigger_type" NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "automation_events" ADD CONSTRAINT "automation_events_run_id_automation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_steps" ADD CONSTRAINT "automation_steps_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_run_status_idx" ON "automation_runs" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE INDEX "automation_step_automation_idx" ON "automation_steps" USING btree ("automation_id","order");--> statement-breakpoint
CREATE INDEX "automation_workspace_status_idx" ON "automations" USING btree ("workspace_id","status");