import type { MetadataRoute } from "next";
import { getIndustries, getOpenJobs, getPosts, getServices } from "@/lib/data";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, industries, posts, jobs] = await Promise.all([
    getServices(),
    getIndustries(),
    getPosts(),
    getOpenJobs(),
  ]);
  const now = new Date();
  const fixed = ["", "/services", "/industries", "/insights", "/case-studies", "/about", "/careers", "/contact"].map(
    (p) => ({
      url: siteUrl(p || "/"),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.8,
    }),
  );
  return [
    ...fixed,
    ...services.map((s) => ({ url: siteUrl(`/services/${s.slug}`), lastModified: s.updatedAt, priority: 0.8 })),
    ...industries.map((s) => ({ url: siteUrl(`/industries/${s.slug}`), lastModified: s.updatedAt, priority: 0.7 })),
    ...posts.map((p) => ({
      url: siteUrl(`/${p.type === "case_study" ? "case-studies" : "insights"}/${p.slug}`),
      lastModified: p.updatedAt,
      priority: 0.6,
    })),
    ...jobs.map((j) => ({ url: siteUrl(`/careers/${j.slug}`), lastModified: j.updatedAt, priority: 0.5 })),
    { url: siteUrl("/privacy"), priority: 0.2 },
    { url: siteUrl("/terms"), priority: 0.2 },
  ];
}
