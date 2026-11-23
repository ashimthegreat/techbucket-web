import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { Collector, daysSince, listOf, words } from "./collector";

/** Checks that read the database: content quality, freshness and completeness. */
export async function contentChecks(c: Collector) {
  const [settings] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1));
  const [services, industries, posts, clients, partners, jobs] = await Promise.all([
    db.select().from(schema.services).where(eq(schema.services.published, true)),
    db.select().from(schema.industries).where(eq(schema.industries.published, true)),
    db.select().from(schema.posts),
    db.select().from(schema.clients).where(eq(schema.clients.published, true)),
    db.select().from(schema.partners).where(eq(schema.partners.published, true)),
    db.select().from(schema.jobs).where(eq(schema.jobs.status, "open")),
  ]);

  /* ---------- Services ---------- */
  for (const s of services) {
    const href = `/admin/services/${s.id}`;
    const len = s.summary.trim().length;
    c.check(len >= 120 && len <= 320, {
      id: `service-summary-${s.id}`,
      category: "content",
      severity: "warning",
      title: `“${s.title}”: summary is ${len < 120 ? "too short" : "too long"} (${len} characters)`,
      passTitle: `“${s.title}”: summary length`,
      detail: "Search engines and AI assistants quote this text. Aim for 120–320 characters: what the service is, who it is for, and what they get.",
      fix: "Rewrite the summary as 2–3 plain sentences.",
      href,
    });
    const w = words(s.body);
    c.check(w >= 300, {
      id: `service-thin-${s.id}`,
      category: "content",
      severity: w < 150 ? "critical" : "warning",
      title: `“${s.title}”: page has only ${w} words`,
      passTitle: `“${s.title}”: enough detail (300+ words)`,
      detail: "Thin pages rarely rank or get cited. Cover scope, process, technologies and brands you work with, typical timelines, and examples from Nepal.",
      fix: "Expand the page content to at least 300 words, ideally 600+.",
      href,
    });
    c.check(s.faqs.length >= 4, {
      id: `service-faq-${s.id}`,
      category: "content",
      severity: s.faqs.length === 0 ? "warning" : "info",
      title: `“${s.title}”: ${s.faqs.length === 0 ? "no FAQs" : `only ${s.faqs.length} FAQ${s.faqs.length === 1 ? "" : "s"}`}`,
      passTitle: `“${s.title}”: 4+ FAQs`,
      detail: "FAQs are shown on the page and marked up for Google and AI answers.",
      fix: "Add 4–6 questions buyers actually ask (cost, timeline, support, brands, locations).",
      href,
    });
    const age = daysSince(s.updatedAt);
    c.check(age <= 90, {
      id: `service-stale-${s.id}`,
      category: "content",
      severity: "warning",
      title: `“${s.title}”: not updated for ${age} days`,
      passTitle: `“${s.title}”: updated in the last 90 days`,
      detail: "Pages not refreshed every few months are far more likely to drop out of AI answers.",
      fix: "Review the page: update facts, add a recent example or FAQ, then save.",
      href,
    });
    const desc = (s.seoDescription ?? s.summary).trim().length;
    c.check(desc >= 70 && desc <= 170, {
      id: `service-metadesc-${s.id}`,
      category: "seo",
      severity: "info",
      title: `“${s.title}”: search description is ${desc} characters`,
      passTitle: `“${s.title}”: search description length`,
      detail: "Google shows about 150–160 characters. Shorter wastes space; longer gets cut.",
      fix: "Set the SEO description (70–160 characters) in the SEO box.",
      href,
    });
  }
  c.check(services.length >= 6, {
    id: "services-count",
    category: "content",
    severity: "warning",
    title: `Only ${services.length} published services`,
    passTitle: "Enough service pages",
    fix: "Each thing clients search for deserves its own page (e.g. CCTV installation, government supply).",
    href: "/admin/services",
  });

  /* ---------- Industries ---------- */
  for (const i of industries) {
    const w = words(i.body);
    c.check(w >= 200, {
      id: `industry-thin-${i.id}`,
      category: "content",
      severity: "warning",
      title: `Industry “${i.title}”: page has only ${w} words`,
      passTitle: `Industry “${i.title}”: enough detail`,
      fix: "Describe the problems you solve for this sector, the systems you deliver, and named clients.",
      href: `/admin/industries/${i.id}`,
    });
    const age = daysSince(i.updatedAt);
    c.check(age <= 180, {
      id: `industry-stale-${i.id}`,
      category: "content",
      severity: "info",
      title: `Industry “${i.title}”: not updated for ${age} days`,
      passTitle: `Industry “${i.title}”: updated in the last 6 months`,
      href: `/admin/industries/${i.id}`,
    });
  }

  /* ---------- Case studies and insights ---------- */
  const published = posts.filter((p) => p.status === "published");
  const cases = published.filter((p) => p.type === "case_study");
  const insights = published.filter((p) => p.type === "insight");
  c.check(cases.length >= 3, {
    id: "case-count",
    category: "content",
    severity: "warning",
    title: `Only ${cases.length} published case stud${cases.length === 1 ? "y" : "ies"}`,
    passTitle: "3+ case studies",
    detail: "Case studies with named clients and numbers are the pages AI assistants cite most for B2B questions.",
    fix: "Publish case studies (with client approval): GIZ Patient Record System, TU, a hospital network.",
    href: "/admin/posts/new",
  });
  const newestCase = Math.min(...cases.map((p) => daysSince(p.publishedAt)));
  if (cases.length > 0)
    c.check(newestCase <= 180, {
      id: "case-fresh",
      category: "content",
      severity: "info",
      title: `No new case study for ${newestCase} days`,
      passTitle: "Case study published in the last 6 months",
      href: "/admin/posts/new",
    });
  const newestInsight = insights.length ? Math.min(...insights.map((p) => daysSince(p.publishedAt))) : Infinity;
  c.check(newestInsight <= 30, {
    id: "insight-fresh",
    category: "content",
    severity: "warning",
    title: insights.length ? `No new article for ${newestInsight} days` : "No articles published yet",
    passTitle: "Article published in the last 30 days",
    detail: "A steady stream of useful articles keeps the site fresh for Google and gives AI tools more to quote.",
    fix: "Publish 1–2 articles a month answering real buyer questions.",
    href: "/admin/posts/new",
  });
  const shortPosts = published.filter((p) => words(p.body) < (p.type === "insight" ? 600 : 400));
  c.check(shortPosts.length === 0, {
    id: "posts-thin",
    category: "content",
    severity: "warning",
    title: `${shortPosts.length} published article${shortPosts.length === 1 ? " is" : "s are"} too short`,
    passTitle: "Articles have enough depth",
    detail: listOf(shortPosts.map((p) => `${p.title} (${words(p.body)} words)`)),
    fix: "Insights should be 600+ words and case studies 400+, with specifics and numbers.",
    href: "/admin/posts",
  });
  const noExcerpt = published.filter((p) => !p.excerpt.trim());
  c.check(noExcerpt.length === 0, {
    id: "posts-excerpt",
    category: "seo",
    severity: "info",
    title: `${noExcerpt.length} article${noExcerpt.length === 1 ? " has" : "s have"} no excerpt`,
    passTitle: "Every article has an excerpt",
    detail: listOf(noExcerpt.map((p) => p.title)),
    fix: "Add a 1–2 sentence excerpt; it becomes the search description.",
    href: "/admin/posts",
  });
  const oldDrafts = posts.filter((p) => p.status === "draft" && daysSince(p.updatedAt) > 30);
  c.check(oldDrafts.length === 0, {
    id: "posts-drafts",
    category: "content",
    severity: "info",
    title: `${oldDrafts.length} draft${oldDrafts.length === 1 ? "" : "s"} untouched for over 30 days`,
    passTitle: "No forgotten drafts",
    detail: listOf(oldDrafts.map((p) => p.title)),
    fix: "Finish and publish them, or delete them.",
    href: "/admin/posts",
  });

  /* ---------- Clients, partners, jobs ---------- */
  c.check(clients.length >= 6, {
    id: "clients-count",
    category: "content",
    severity: "info",
    title: `Only ${clients.length} clients listed`,
    passTitle: "6+ clients listed",
    href: "/admin/clients",
  });
  const noLogo = [...clients, ...partners].filter((x) => !x.logoUrl);
  c.check(noLogo.length === 0, {
    id: "logos-missing",
    category: "content",
    severity: "info",
    title: `${noLogo.length} client or partner logo${noLogo.length === 1 ? " is" : "s are"} missing`,
    passTitle: "All client and partner logos present",
    detail: listOf(noLogo.map((x) => x.name)),
    href: "/admin/clients",
  });
  const expiredJobs = jobs.filter((j) => j.closesAt && new Date(j.closesAt).getTime() < Date.now());
  c.check(expiredJobs.length === 0, {
    id: "jobs-expired",
    category: "content",
    severity: "warning",
    title: `${expiredJobs.length} job${expiredJobs.length === 1 ? " is" : "s are"} still open after the closing date`,
    passTitle: "No expired job posts",
    detail: listOf(expiredJobs.map((j) => j.title)),
    fix: "Close them. Expired job posts mislead applicants and Google Jobs.",
    href: "/admin/jobs",
  });

  /* ---------- Settings that feed SEO ---------- */
  const s = settings;
  const missingLocal = [
    !s.latitude || !s.longitude ? "office latitude/longitude" : null,
    !s.openingHours ? "opening hours" : null,
    !s.mapUrl ? "Google Maps link" : null,
  ].filter(Boolean) as string[];
  c.check(missingLocal.length === 0, {
    id: "settings-local",
    category: "seo",
    severity: "warning",
    title: `Missing local business details: ${missingLocal.join(", ")}`,
    passTitle: "Local business details complete",
    detail: "These go into the company's structured data and help with “IT company in Kathmandu”-type searches.",
    fix: "Fill them in under Site settings → Search engines & AI search.",
    href: "/admin/settings",
  });
  c.check(!!s.googleVerification, {
    id: "settings-gsc",
    category: "seo",
    severity: "warning",
    title: "Google Search Console is not verified",
    passTitle: "Google Search Console code set",
    fix: "Add the site in Search Console, paste the HTML tag in Site settings, verify, then submit sitemap.xml.",
    href: "/admin/settings",
  });
  c.check(!!s.bingVerification, {
    id: "settings-bing",
    category: "seo",
    severity: "warning",
    title: "Bing Webmaster Tools is not verified",
    passTitle: "Bing Webmaster Tools code set",
    detail: "Bing feeds Copilot and many AI search tools.",
    fix: "Import the site from Search Console at bing.com/webmasters, or paste Bing's HTML tag in Site settings.",
    href: "/admin/settings",
  });
  const socials = s.socials ?? {};
  c.check(!!socials.google, {
    id: "settings-gbp",
    category: "seo",
    severity: "warning",
    title: "Google Business Profile link not set",
    passTitle: "Google Business Profile linked",
    fix: "Add it under Site settings → Social profiles.",
    href: "/admin/settings",
  });
  const missingSocial = ["linkedin", "facebook"].filter((k) => !socials[k]);
  c.check(missingSocial.length === 0, {
    id: "settings-social",
    category: "seo",
    severity: "info",
    title: `Social profile missing: ${missingSocial.join(", ")}`,
    passTitle: "LinkedIn and Facebook linked",
    href: "/admin/settings",
  });

  /* ---------- Duplicate search titles ---------- */
  const titles = new Map<string, string[]>();
  const add = (t: string, where: string) => titles.set(t.toLowerCase(), [...(titles.get(t.toLowerCase()) ?? []), where]);
  services.forEach((x) => add(x.seoTitle || `${x.title} in Nepal`, `Service: ${x.title}`));
  industries.forEach((x) => add(x.seoTitle || x.title, `Industry: ${x.title}`));
  published.forEach((x) => add(x.seoTitle || x.title, `Article: ${x.title}`));
  const dupes = [...titles.values()].filter((v) => v.length > 1);
  c.check(dupes.length === 0, {
    id: "seo-dupe-titles",
    category: "seo",
    severity: "warning",
    title: `${dupes.length} search title${dupes.length === 1 ? " is" : "s are"} used on more than one page`,
    passTitle: "Search titles are unique",
    detail: listOf(dupes.map((d) => d.join(" / "))),
    fix: "Give each page its own SEO title.",
  });

  /* ---------- Enquiries and applications waiting ---------- */
  const [[waitingLeads], [waitingApps]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.leads)
      .where(and(eq(schema.leads.status, "new"), lt(schema.leads.createdAt, sql`now() - interval '2 days'`))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.applications)
      .where(and(eq(schema.applications.status, "new"), lt(schema.applications.createdAt, sql`now() - interval '7 days'`))),
  ]);
  c.check(waitingLeads.n === 0, {
    id: "leads-waiting",
    category: "operations",
    severity: "critical",
    title: `${waitingLeads.n} enquir${waitingLeads.n === 1 ? "y has" : "ies have"} waited more than 2 days`,
    passTitle: "No enquiries waiting over 2 days",
    fix: "Reply, then set each one to Contacted.",
    href: "/admin/leads?status=new",
  });
  const [waitingChats] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.chatSessions)
    .where(and(eq(schema.chatSessions.status, "waiting"), lt(schema.chatSessions.lastMessageAt, sql`now() - interval '30 minutes'`)));
  c.check(waitingChats.n === 0, {
    id: "chats-waiting",
    category: "operations",
    severity: "critical",
    title: `${waitingChats.n} website chat${waitingChats.n === 1 ? " has" : "s have"} waited over 30 minutes for a reply`,
    passTitle: "No chats left waiting",
    fix: "Reply in Live chat (the visitor gets your reply by email if they left), or close the chat.",
    href: "/admin/chats",
  });
  c.check(waitingApps.n === 0, {
    id: "apps-waiting",
    category: "operations",
    severity: "warning",
    title: `${waitingApps.n} job application${waitingApps.n === 1 ? " has" : "s have"} waited more than a week`,
    passTitle: "No applications waiting over a week",
    href: "/admin/applications",
  });
}
