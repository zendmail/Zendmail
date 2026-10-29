ALTER TABLE "campaigns" ADD COLUMN "content_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "content_revision" integer DEFAULT 0 NOT NULL;