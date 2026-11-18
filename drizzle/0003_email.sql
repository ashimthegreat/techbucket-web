CREATE TABLE "email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"to" varchar(300) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"kind" varchar(40) NOT NULL,
	"status" varchar(20) NOT NULL,
	"error" text,
	"body" text,
	"lead_id" integer,
	"sent_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"purpose" varchar(20) DEFAULT 'reset' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "smtp_host" varchar(200);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "smtp_port" integer;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "smtp_user" varchar(200);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "smtp_pass_enc" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "smtp_from_name" varchar(120);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "auto_reply" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_tokens" ADD CONSTRAINT "password_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_log_created_idx" ON "email_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_log_lead_idx" ON "email_log" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "password_tokens_user_idx" ON "password_tokens" USING btree ("user_id");