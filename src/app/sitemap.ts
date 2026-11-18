import type { MetadataRoute } from "next";
import {
  getClients,
  getFeatured,
  getIndustries,
  getOpenJobs,
  getPartners,
  getPosts,
  getServices,
  getSettings,
  getStats,
} from "@/lib/data";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Dated = { updatedAt: string | Date };

/** Most recent real edit among the given records. Honest dates keep search engines trusting lastmod. */
function latest(...groups: Dated[][]): Date {
  let max = 0;
  for (const g of groups) for (const r of g) max = Math.max(max, new Date(r.updatedAt).getTime());
  return new Date(max || Date.now());
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, services, industries, posts, jobs, clients, partners, stats, featured] = await Promise.all([
    getSettings(),
    getServices(),
    getIndustries(),
    getPosts(),
    getOpenJobs(),
    getClients(),
    getPartners(),
    getStats(),
    getFeatured(),
  ]);
  const s = [settings];
  const insights = posts.filter((p) => p.type === "insight");
  const cases = posts.filter((p) => p.type === "case_study");

  const fixed: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), lastModified: latest(s, services, posts, clients, partners, stats, featured), priority: 1 },
    { url: siteUrl("/services"), lastModified: latest(s, services), priority: 0.9 },
    { url: siteUrl("/industries"), lastModified: latest(s, industries), priority: 0.8 },
    { url: siteUrl("/insights"), lastModified: latest(s, insights), priority: 0.7 },
    { url: siteUrl("/case-studies"), lastModified: latest(s, cases), priority: 0.8 },
    { url: siteUrl("/about"), lastModified: latest(s, clients, partners, stats), priority: 0.8 },
    { url: siteUrl("/careers"), lastModified: latest(s, jobs), priority: 0.5 },
    { url: siteUrl("/contact"), lastModified: latest(s), priority: 0.7 },
  ];

  return [
    ...fixed,
    ...services.map((x) => ({ url: siteUrl(`/services/${x.slug}`), lastModified: new Date(x.updatedAt), priority: 0.9 })),
    ...industries.map((x) => ({ url: siteUrl(`/industries/${x.slug}`), lastModified: new Date(x.updatedAt), priority: 0.7 })),
    ...posts.map((p) => ({
      url: siteUrl(`/${p.type === "case_study" ? "case-studies" : "insights"}/${p.slug}`),
      lastModified: new Date(p.updatedAt),
      priority: p.type === "case_study" ? 0.8 : 0.6,
    })),
    ...jobs.map((j) => ({ url: siteUrl(`/careers/${j.slug}`), lastModified: new Date(j.updatedAt), priority: 0.5 })),
    { url: siteUrl("/privacy"), priority: 0.2 },
    { url: siteUrl("/terms"), priority: 0.2 },
  ];
}
