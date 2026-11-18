CREATE TABLE "health_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger" varchar(20) DEFAULT 'schedule' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"duration_ms" integer,
	"pages_checked" integer DEFAULT 0 NOT NULL,
	"scores" jsonb,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"passed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE INDEX "health_runs_started_idx" ON "health_runs" USING btree ("started_at");