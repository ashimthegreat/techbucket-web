CREATE TYPE "public"."application_status" AS ENUM('new', 'shortlisted', 'interview', 'offer', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."featured_theme" AS ENUM('light', 'dark');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'won', 'lost', 'spam');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('insight', 'case_study');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer,
	"name" varchar(160) NOT NULL,
	"email" varchar(200) NOT NULL,
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"cover_letter" text DEFAULT '' NOT NULL,
	"cv_path" text,
	"cv_original_name" varchar(255),
	"status" "application_status" DEFAULT 'new' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(80) NOT NULL,
	"entity" varchar(80) NOT NULL,
	"entity_id" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"sector" varchar(120) DEFAULT '' NOT NULL,
	"logo_url" text,
	"website" text,
	"show_on_home" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "featured_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"kicker" varchar(80) NOT NULL,
	"title" varchar(240) NOT NULL,
	"cta_label" varchar(80) NOT NULL,
	"href" varchar(300) NOT NULL,
	"theme" "featured_theme" DEFAULT 'light' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"clients_text" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"seo_title" varchar(200),
	"seo_description" varchar(320),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "industries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(200) NOT NULL,
	"department" varchar(120) DEFAULT '' NOT NULL,
	"location" varchar(120) DEFAULT 'Kathmandu' NOT NULL,
	"employment_type" varchar(60) DEFAULT 'Full-time' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" "job_status" DEFAULT 'open' NOT NULL,
	"closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"organisation" varchar(200) DEFAULT '' NOT NULL,
	"email" varchar(200) NOT NULL,
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"service" varchar(160) DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"source" varchar(160) DEFAULT 'contact' NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"ip" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size" integer NOT NULL,
	"alt" varchar(255) DEFAULT '' NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"logo_url" text,
	"website" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "post_type" DEFAULT 'insight' NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(240) NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"category" varchar(80) DEFAULT '' NOT NULL,
	"client_name" varchar(200),
	"cover_url" text,
	"cover_headline" varchar(80),
	"read_minutes" integer DEFAULT 5 NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"author_id" integer,
	"seo_title" varchar(200),
	"seo_description" varchar(320),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"seo_title" varchar(200),
	"seo_description" varchar(320),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"company_name" varchar(160) NOT NULL,
	"tagline" varchar(200) NOT NULL,
	"hero_eyebrow" varchar(200) NOT NULL,
	"hero_title" varchar(200) NOT NULL,
	"hero_subtitle" text NOT NULL,
	"about_statement" text NOT NULL,
	"about_statement_muted" text NOT NULL,
	"about_body" text NOT NULL,
	"mission" text NOT NULL,
	"vision" text NOT NULL,
	"values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"address" varchar(240) NOT NULL,
	"address_locality" varchar(120) NOT NULL,
	"address_region" varchar(120) NOT NULL,
	"phone_primary" varchar(60) NOT NULL,
	"phone_secondary" varchar(60),
	"email" varchar(200) NOT NULL,
	"lead_notify_email" varchar(200),
	"vat_number" varchar(60),
	"founded_year" integer,
	"socials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_seo_title" varchar(200) NOT NULL,
	"default_seo_description" varchar(320) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" varchar(40) NOT NULL,
	"suffix" varchar(10) DEFAULT '' NOT NULL,
	"label" varchar(120) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(200) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'editor' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_job_idx" ON "applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_type_slug_idx" ON "posts" USING btree ("type","slug");--> statement-breakpoint
CREATE INDEX "posts_status_published_idx" ON "posts" USING btree ("status","published_at");