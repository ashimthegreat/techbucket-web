import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** Cache tag cleared by every admin content change. */
export const CONTENT_TAG = "content";
const opts = { tags: [CONTENT_TAG], revalidate: 3600 };

const {
  siteSettings,
  services,
  industries,
  clients,
  partners,
  stats,
  featuredItems,
  posts,
  jobs,
} = schema;

export type PublicPost = Omit<schema.Post, "publishedAt" | "createdAt" | "updatedAt"> & {
  publishedAt: string | null;
  updatedAt: string;
};

function serialisePost(p: schema.Post): PublicPost {
  return {
    ...p,
    publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
}

export const getSettings = unstable_cache(
  async () => {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
    if (!row) throw new Error("Site settings missing. Run: node scripts/seed.mjs");
    return { ...row, updatedAt: new Date(row.updatedAt).toISOString() };
  },
  ["settings"],
  opts,
);

export const getServices = unstable_cache(
  async () =>
    db
      .select()
      .from(services)
      .where(eq(services.published, true))
      .orderBy(asc(services.sortOrder), asc(services.id)),
  ["services"],
  opts,
);

export const getService = unstable_cache(
  async (slug: string) => {
    const [row] = await db
      .select()
      .from(services)
      .where(and(eq(services.slug, slug), eq(services.published, true)));
    return row ?? null;
  },
  ["service"],
  opts,
);

export const getIndustries = unstable_cache(
  async () =>
    db
      .select()
      .from(industries)
      .where(eq(industries.published, true))
      .orderBy(asc(industries.sortOrder), asc(industries.id)),
  ["industries"],
  opts,
);

export const getIndustry = unstable_cache(
  async (slug: string) => {
    const [row] = await db
      .select()
      .from(industries)
      .where(and(eq(industries.slug, slug), eq(industries.published, true)));
    return row ?? null;
  },
  ["industry"],
  opts,
);

export const getClients = unstable_cache(
  async () =>
    db
      .select()
      .from(clients)
      .where(eq(clients.published, true))
      .orderBy(asc(clients.sortOrder), asc(clients.id)),
  ["clients"],
  opts,
);

export const getPartners = unstable_cache(
  async () =>
    db
      .select()
      .from(partners)
      .where(eq(partners.published, true))
      .orderBy(asc(partners.sortOrder), asc(partners.id)),
  ["partners"],
  opts,
);

export const getStats = unstable_cache(
  async () =>
    db
      .select()
      .from(stats)
      .where(eq(stats.published, true))
      .orderBy(asc(stats.sortOrder), asc(stats.id)),
  ["stats"],
  opts,
);

export const getFeatured = unstable_cache(
  async () =>
    db
      .select()
      .from(featuredItems)
      .where(eq(featuredItems.published, true))
      .orderBy(asc(featuredItems.sortOrder), asc(featuredItems.id)),
  ["featured"],
  opts,
);

export const getPosts = unstable_cache(
  async (type?: "insight" | "case_study", limit = 100) => {
    const where = type
      ? and(eq(posts.status, "published"), eq(posts.type, type))
      : eq(posts.status, "published");
    const rows = await db
      .select()
      .from(posts)
      .where(where)
      .orderBy(desc(posts.publishedAt), desc(posts.id))
      .limit(limit);
    return rows.map(serialisePost);
  },
  ["posts"],
  opts,
);

export const getPost = unstable_cache(
  async (type: "insight" | "case_study", slug: string) => {
    const [row] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.type, type), eq(posts.slug, slug), eq(posts.status, "published")));
    return row ? serialisePost(row) : null;
  },
  ["post"],
  opts,
);

export const getOpenJobs = unstable_cache(
  async () => {
    const rows = await db
      .select()
      .from(jobs)
      .where(eq(jobs.status, "open"))
      .orderBy(desc(jobs.createdAt));
    return rows.map((j) => ({
      ...j,
      createdAt: new Date(j.createdAt).toISOString(),
      updatedAt: new Date(j.updatedAt).toISOString(),
      closesAt: j.closesAt ? new Date(j.closesAt).toISOString() : null,
    }));
  },
  ["jobs"],
  opts,
);

export const getJob = unstable_cache(
  async (slug: string) => {
    const [j] = await db.select().from(jobs).where(eq(jobs.slug, slug));
    if (!j) return null;
    return {
      ...j,
      createdAt: new Date(j.createdAt).toISOString(),
      updatedAt: new Date(j.updatedAt).toISOString(),
      closesAt: j.closesAt ? new Date(j.closesAt).toISOString() : null,
    };
  },
  ["job"],
  opts,
);
