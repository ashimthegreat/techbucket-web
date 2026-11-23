import "server-only";
import { getIndustries, getPosts, getServices, getSettings } from "@/lib/data";
import { plainText } from "@/lib/markdown";
import type { ChatCard } from "@/db/schema";

export type Knowledge = {
  text: string;
  cards: Map<string, ChatCard>;
  faqs: { q: string; a: string; card?: string }[];
  /** Service menu for the guided (no-AI) assistant. */
  services: { id: string; title: string; summary: string; faqs: { q: string; a: string }[] }[];
  /** Address, phone, email and hours, ready to show. */
  contactText: string;
  company: string;
  phone: string;
  email: string;
};

let cache: { at: number; k: Knowledge } | null = null;

/**
 * Everything the assistant may answer from, built from the website's own content.
 * Kept in memory for 5 minutes; admin edits show up after that.
 */
export async function knowledge(): Promise<Knowledge> {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return cache.k;
  const [s, services, industries, posts] = await Promise.all([getSettings(), getServices(), getIndustries(), getPosts(undefined, 40)]);
  const cards = new Map<string, ChatCard>();
  const faqs: Knowledge["faqs"] = [];
  const out: string[] = [];

  out.push(`# ${s.companyName}`);
  out.push(plainText(s.defaultSeoDescription || s.tagline, 600));
  out.push(
    `Address: ${s.address}. Phone: ${s.phonePrimary}${s.phoneSecondary ? `, ${s.phoneSecondary}` : ""}. Email: ${s.email}.` +
      (s.openingHours ? ` Office hours: ${s.openingHours} (Su=Sunday … Fr=Friday, Nepal time).` : "") +
      (s.vatNumber ? ` VAT/PAN: ${s.vatNumber}.` : "") +
      (s.foundedYear ? ` Founded ${s.foundedYear}.` : ""),
  );
  if (s.aboutBody) out.push(`About: ${plainText(s.aboutBody, 1200)}`);

  out.push("\n## Services (card id in brackets)");
  for (const x of services) {
    const id = `service:${x.slug}`;
    cards.set(id, { kind: "service", title: x.title, text: plainText(x.summary, 140), href: `/services/${x.slug}` });
    out.push(`### ${x.title} [${id}]`);
    out.push(plainText(x.summary, 400));
    if (x.highlights.length) out.push(`Includes: ${x.highlights.join("; ")}`);
    out.push(plainText(x.body, 1400));
    for (const f of x.faqs) {
      out.push(`Q: ${f.q}\nA: ${f.a}`);
      faqs.push({ ...f, card: id });
    }
  }
  if (industries.length) {
    out.push("\n## Industries served");
    for (const x of industries) {
      const id = `industry:${x.slug}`;
      cards.set(id, { kind: "page", title: x.title, text: plainText(x.summary, 140), href: `/industries/${x.slug}` });
      out.push(`- ${x.title} [${id}]: ${plainText(x.summary, 300)}`);
    }
  }
  const cases = posts.filter((p) => p.type === "case_study");
  if (cases.length) {
    out.push("\n## Case studies");
    for (const p of cases) {
      const id = `case:${p.slug}`;
      cards.set(id, { kind: "case", title: p.title, text: plainText(p.excerpt || p.body, 140), href: `/case-studies/${p.slug}` });
      out.push(`- ${p.title}${p.clientName ? ` (client: ${p.clientName})` : ""} [${id}]: ${plainText(p.excerpt || p.body, 300)}`);
    }
  }
  const insights = posts.filter((p) => p.type === "insight").slice(0, 12);
  if (insights.length) {
    out.push("\n## Articles");
    for (const p of insights) {
      const id = `article:${p.slug}`;
      cards.set(id, { kind: "page", title: p.title, text: plainText(p.excerpt || p.body, 140), href: `/insights/${p.slug}` });
      out.push(`- ${p.title} [${id}]: ${plainText(p.excerpt || p.body, 200)}`);
    }
  }
  cards.set("page:contact", { kind: "page", title: "Contact us", text: `${s.address} · ${s.phonePrimary}`, href: "/contact" });
  cards.set("page:careers", { kind: "page", title: "Careers", text: "Open positions at Tech Bucket", href: "/careers" });
  out.push("\nOther pages: [page:contact] contact page, [page:careers] job openings.");

  const k: Knowledge = {
    text: out.join("\n"),
    cards,
    faqs,
    services: services.map((x) => ({ id: `service:${x.slug}`, title: x.title, summary: plainText(x.summary, 500), faqs: x.faqs })),
    contactText: [
      `Office: ${s.address}`,
      `Phone: ${s.phonePrimary}${s.phoneSecondary ? `, ${s.phoneSecondary}` : ""}`,
      `Email: ${s.email}`,
      s.openingHours ? `Hours: ${s.openingHours.replace(/\bSu\b/g, "Sun").replace(/\bFr\b/g, "Fri").replace(/\bSa\b/g, "Sat")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    company: s.companyName,
    phone: s.phonePrimary,
    email: s.email,
  };
  cache = { at: Date.now(), k };
  return k;
}

export function forgetKnowledge() {
  cache = null;
}
