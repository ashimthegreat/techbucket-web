import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "@/components/icons";
import { CtaBand, Dot, JsonLd, PageHero } from "@/components/site/sections";
import { getServices } from "@/lib/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "IT Services in Nepal — Consulting, Cybersecurity, Networks & Cloud",
    description:
      "IT consultancy, network management, cybersecurity, servers and storage, software, backup, cloud and managed services for organisations across Nepal.",
    path: "/services",
  });
}

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, { label: "What we do" }]}
        eyebrow="What we do"
        title={<>End-to-end IT services, one accountable partner<Dot /></>}
        lede="From the first consultation to round-the-clock operations, every engagement is planned, deployed with a rollback plan, tested with your team and supported after go-live."
      />
      <section className="bg-white">
        <div className="container-site grid gap-x-10 py-20 sm:py-28 md:grid-cols-2">
          {services.map((s, i) => (
            <Link
              key={s.id}
              href={`/services/${s.slug}`}
              className="group flex flex-col gap-4 border-t border-ink py-9 sm:py-10"
            >
              <span className="text-sm font-semibold text-subtle">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="font-display text-[clamp(1.6rem,2.6vw,2.25rem)] leading-[1.1] font-medium tracking-[-0.02em] group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
                {s.title}
              </h2>
              <p className="max-w-[560px] text-base leading-relaxed text-muted sm:text-lg">{s.summary}</p>
              {s.highlights.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {s.highlights.map((h) => (
                    <li key={h} className="border border-line px-3 py-1.5 text-sm text-slate">{h}</li>
                  ))}
                </ul>
              )}
              <span className="mt-2 flex items-center gap-2 text-[15px] font-semibold">
                Learn more <ArrowRight className="text-accent-ink transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <CtaBand />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: services.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: siteUrl(`/services/${s.slug}`),
            name: s.title,
          })),
        }}
      />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "What we do", path: "/services" }])} />
    </>
  );
}
