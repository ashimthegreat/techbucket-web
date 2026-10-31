import {
  pgTable,
  pgEnum,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ---------- Enums ---------- */
export const roleEnum = pgEnum("role", ["admin", "editor"]);
export const postTypeEnum = pgEnum("post_type", ["insight", "case_study"]);
export const publishStatusEnum = pgEnum("publish_status", ["draft", "published"]);
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
  "spam",
]);
export const jobStatusEnum = pgEnum("job_status", ["open", "closed"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "new",
  "shortlisted",
  "interview",
  "offer",
  "rejected",
]);
export const featuredThemeEnum = pgEnum("featured_theme", ["light", "dark"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

const seo = {
  seoTitle: varchar("seo_title", { length: 200 }),
  seoDescription: varchar("seo_description", { length: 320 }),
};

/* ---------- Users ---------- */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("editor"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

/* ---------- Site settings (single row, id = 1) ---------- */
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  companyName: varchar("company_name", { length: 160 }).notNull(),
  tagline: varchar("tagline", { length: 200 }).notNull(),
  heroEyebrow: varchar("hero_eyebrow", { length: 200 }).notNull(),
  heroTitle: varchar("hero_title", { length: 200 }).notNull(),
  heroSubtitle: text("hero_subtitle").notNull(),
  aboutStatement: text("about_statement").notNull(),
  aboutStatementMuted: text("about_statement_muted").notNull(),
  aboutBody: text("about_body").notNull(),
  mission: text("mission").notNull(),
  vision: text("vision").notNull(),
  values: jsonb("values").$type<string[]>().notNull().default([]),
  address: varchar("address", { length: 240 }).notNull(),
  addressLocality: varchar("address_locality", { length: 120 }).notNull(),
  addressRegion: varchar("address_region", { length: 120 }).notNull(),
  phonePrimary: varchar("phone_primary", { length: 60 }).notNull(),
  phoneSecondary: varchar("phone_secondary", { length: 60 }),
  email: varchar("email", { length: 200 }).notNull(),
  leadNotifyEmail: varchar("lead_notify_email", { length: 200 }),
  vatNumber: varchar("vat_number", { length: 60 }),
  foundedYear: integer("founded_year"),
  socials: jsonb("socials").$type<Record<string, string>>().notNull().default({}),
  defaultSeoTitle: varchar("default_seo_title", { length: 200 }).notNull(),
  defaultSeoDescription: varchar("default_seo_description", { length: 320 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/* ---------- Services ---------- */
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  summary: text("summary").notNull(),
  body: text("body").notNull().default(""),
  highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...seo,
  ...timestamps,
});

/* ---------- Industries ---------- */
export const industries = pgTable("industries", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  summary: text("summary").notNull(),
  body: text("body").notNull().default(""),
  clientsText: text("clients_text").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...seo,
  ...timestamps,
});

/* ---------- Clients ---------- */
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  sector: varchar("sector", { length: 120 }).notNull().default(""),
  logoUrl: text("logo_url"),
  website: text("website"),
  showOnHome: boolean("show_on_home").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

/* ---------- Technology partners ---------- */
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  logoUrl: text("logo_url"),
  website: text("website"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

/* ---------- Homepage stats ---------- */
export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  value: varchar("value", { length: 40 }).notNull(),
  suffix: varchar("suffix", { length: 10 }).notNull().default(""),
  label: varchar("label", { length: 120 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

/* ---------- Homepage featured cards ---------- */
export const featuredItems = pgTable("featured_items", {
  id: serial("id").primaryKey(),
  kicker: varchar("kicker", { length: 80 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  ctaLabel: varchar("cta_label", { length: 80 }).notNull(),
  href: varchar("href", { length: 300 }).notNull(),
  theme: featuredThemeEnum("theme").notNull().default("light"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

/* ---------- Insights & case studies ---------- */
export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    type: postTypeEnum("type").notNull().default("insight"),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull().default(""),
    category: varchar("category", { length: 80 }).notNull().default(""),
    clientName: varchar("client_name", { length: 200 }),
    coverUrl: text("cover_url"),
    coverHeadline: varchar("cover_headline", { length: 80 }),
    readMinutes: integer("read_minutes").notNull().default(5),
    status: publishStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    ...seo,
    ...timestamps,
  },
  (t) => [
    uniqueIndex("posts_type_slug_idx").on(t.type, t.slug),
    index("posts_status_published_idx").on(t.status, t.publishedAt),
  ],
);

/* ---------- Careers ---------- */
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  department: varchar("department", { length: 120 }).notNull().default(""),
  location: varchar("location", { length: 120 }).notNull().default("Kathmandu"),
  employmentType: varchar("employment_type", { length: 60 }).notNull().default("Full-time"),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull().default(""),
  status: jobStatusEnum("status").notNull().default("open"),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  ...timestamps,
});

export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    phone: varchar("phone", { length: 60 }).notNull().default(""),
    coverLetter: text("cover_letter").notNull().default(""),
    cvPath: text("cv_path"),
    cvOriginalName: varchar("cv_original_name", { length: 255 }),
    status: applicationStatusEnum("status").notNull().default("new"),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (t) => [index("applications_job_idx").on(t.jobId)],
);

/* ---------- Leads / enquiries ---------- */
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    organisation: varchar("organisation", { length: 200 }).notNull().default(""),
    email: varchar("email", { length: 200 }).notNull(),
    phone: varchar("phone", { length: 60 }).notNull().default(""),
    service: varchar("service", { length: 160 }).notNull().default(""),
    message: text("message").notNull(),
    source: varchar("source", { length: 160 }).notNull().default("contact"),
    status: leadStatusEnum("status").notNull().default("new"),
    notes: text("notes").notNull().default(""),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [index("leads_status_idx").on(t.status), index("leads_created_idx").on(t.createdAt)],
);

/* ---------- Media library ---------- */
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  size: integer("size").notNull(),
  alt: varchar("alt", { length: 255 }).notNull().default(""),
  uploadedBy: integer("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});

/* ---------- Audit log ---------- */
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 80 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: varchar("entity_id", { length: 80 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Industry = typeof industries.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Partner = typeof partners.$inferSelect;
export type Stat = typeof stats.$inferSelect;
export type FeaturedItem = typeof featuredItems.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Media = typeof media.$inferSelect;
