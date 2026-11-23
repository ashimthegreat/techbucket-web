CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"body" text NOT NULL,
	"meta" jsonb,
	"agent_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'bot' NOT NULL,
	"visitor_name" varchar(160),
	"visitor_email" varchar(200),
	"visitor_phone" varchar(60),
	"visitor_org" varchar(200),
	"topic" varchar(200),
	"page" varchar(500),
	"lead_id" integer,
	"assigned_to" integer,
	"ip" varchar(64),
	"user_agent" text,
	"visitor_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_seen_at" timestamp with time zone,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "assigned_to" integer;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "chat_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "chat_assignee_id" integer;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "chat_welcome" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "chat_ai_key_enc" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "chat_ai_model" varchar(80);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "chat_daily_limit" integer DEFAULT 400 NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_session_idx" ON "chat_messages" USING btree ("session_id","id");--> statement-breakpoint
CREATE INDEX "chat_sessions_status_idx" ON "chat_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chat_sessions_last_idx" ON "chat_sessions" USING btree ("last_message_at");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;