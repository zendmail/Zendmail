CREATE TABLE "landing_page_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landing_page_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signup_confirmations" ADD COLUMN "landing_page_id" uuid;--> statement-breakpoint
ALTER TABLE "landing_page_signups" ADD CONSTRAINT "landing_page_signups_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_page_signups" ADD CONSTRAINT "landing_page_signups_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "landing_page_signup_unique" ON "landing_page_signups" USING btree ("landing_page_id","contact_id");--> statement-breakpoint
CREATE INDEX "landing_page_signup_page_idx" ON "landing_page_signups" USING btree ("landing_page_id","created_at");