CREATE TYPE "public"."autopilot_kind" AS ENUM('CAMPAIGN', 'WELCOME_FLOW');--> statement-breakpoint
CREATE TYPE "public"."autopilot_status" AS ENUM('PROPOSED', 'APPROVED', 'DISMISSED');--> statement-breakpoint
CREATE TABLE "autopilot_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" text NOT NULL,
	"kind" "autopilot_kind" NOT NULL,
	"status" "autopilot_status" DEFAULT 'PROPOSED' NOT NULL,
	"title" text NOT NULL,
	"goal" text NOT NULL,
	"why" text NOT NULL,
	"timing" text NOT NULL,
	"audience" jsonb NOT NULL,
	"template_key" text NOT NULL,
	"copy_source" text NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text DEFAULT '' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"theme" jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "autopilot_proposals" ADD CONSTRAINT "autopilot_proposals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "autopilot_proposal_workspace_idx" ON "autopilot_proposals" USING btree ("workspace_id","status");