import { getClients, getIndustries, getPartners, getPosts, getServices, getSettings } from "@/lib/data";
import { plainText } from "@/lib/markdown";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const oneLine = (t: string, max = 220) => {
  const s = plainText(t, 2000).replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/** /llms.txt — a plain Markdown map of the site for AI assistants (llmstxt.org format). */
export async function GET() {
  const [s, services, industries, posts, clients, partners] = await Promise.all([
    getSettings(),
    getServices(),
    getIndustries(),
    getPosts(undefined, 30),
    getClients(),
    getPartners(),
  ]);
  const cases = posts.filter((p) => p.type === "case_study");
  const insights = posts.filter((p) => p.type === "insight");
  const out: string[] = [];

  out.push(`# ${s.companyName}`, "");
  out.push(`> ${oneLine(s.defaultSeoDescription || s.tagline, 400)}`, "");
  out.push(
    [
      `${s.companyName} is based at ${
        s.address.toLowerCase().includes(s.addressLocality.toLowerCase()) ? s.address : [s.address, s.addressLocality].filter(Boolean).join(", ")
      }, Nepal` +
        (s.foundedYear ? ` (founded ${s.foundedYear})` : "") +
        ".",
      `Phone: ${s.phonePrimary}${s.phoneSecondary ? `, ${s.phoneSecondary}` : ""}. Email: ${s.email}.`,
      s.vatNumber ? `VAT/PAN: ${s.vatNumber}.` : "",
      clients.length ? `Clients include ${clients.slice(0, 15).map((c) => c.name).join(", ")}.` : "",
      partners.length ? `Technology partners: ${partners.map((p) => p.name).join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    "",
  );

  out.push("## Services", "");
  for (const x of services) out.push(`- [${x.title}](${siteUrl(`/services/${x.slug}`)}): ${oneLine(x.summary)}`);
  out.push("");

  if (industries.length) {
    out.push("## Industries", "");
    for (const x of industries) out.push(`- [${x.title}](${siteUrl(`/industries/${x.slug}`)}): ${oneLine(x.summary)}`);
    out.push("");
  }

  if (cases.length) {
    out.push("## Case studies", "");
    for (const p of cases)
      out.push(`- [${p.title}](${siteUrl(`/case-studies/${p.slug}`)})${p.clientName ? ` (${p.clientName})` : ""}: ${oneLine(p.excerpt || p.body)}`);
    out.push("");
  }

  out.push("## Company", "");
  out.push(`- [About ${s.companyName}](${siteUrl("/about")}): mission, values, clients and partners`);
  out.push(`- [Contact](${siteUrl("/contact")}): enquiries, office address and phone`);
  out.push(`- [Careers](${siteUrl("/careers")}): open positions`);
  out.push("");

  if (insights.length) {
    out.push("## Optional", "");
    for (const p of insights.slice(0, 15)) out.push(`- [${p.title}](${siteUrl(`/insights/${p.slug}`)}): ${oneLine(p.excerpt || p.body)}`);
    out.push("");
  }

  return new Response(out.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
