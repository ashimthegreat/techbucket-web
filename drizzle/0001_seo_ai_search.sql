ALTER TABLE "services" ADD COLUMN "faqs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "google_verification" varchar(200);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "bing_verification" varchar(200);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "latitude" varchar(30);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "longitude" varchar(30);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "opening_hours" varchar(200);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "map_url" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "allow_ai_training" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_title" varchar(120);