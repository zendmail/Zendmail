CREATE TYPE "public"."segment_match_type" AS ENUM('ALL', 'ANY');--> statement-breakpoint
CREATE TYPE "public"."segment_rule_field" AS ENUM('STATUS', 'TOTAL_SPENT', 'TOTAL_ORDERS', 'LAST_PURCHASE_AT', 'COUNTRY', 'HAS_TAG', 'CONSENT_STATUS');--> statement-breakpoint
CREATE TYPE "public"."segment_rule_operator" AS ENUM('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'BEFORE', 'AFTER', 'IS_NULL', 'IS_NOT_NULL');--> statement-breakpoint
CREATE TABLE "segment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" uuid NOT NULL,
	"field" "segment_rule_field" NOT NULL,
	"operator" "segment_rule_operator" NOT NULL,
	"value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"match_type" "segment_match_type" DEFAULT 'ALL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "segment_rules" ADD CONSTRAINT "segment_rules_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "segment_workspace_name_unique" ON "segments" USING btree ("workspace_id","name");