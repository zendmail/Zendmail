CREATE TYPE "public"."platform_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "platform_role" DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp with time zone;