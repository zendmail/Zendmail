ALTER TABLE "workspaces" ADD COLUMN "max_emails_per_contact_per_week" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "max_emails_per_week" integer;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "paused_until" timestamp with time zone;