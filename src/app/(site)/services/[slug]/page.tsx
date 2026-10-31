import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "@/components/icons";
import { CtaBand, Dot, JsonLd, PageHero } from "@/components/site/sections";
import { LeadForm } from "@/components/site/forms";
import { getService, getServices, getSettings } from "@/lib/data";
import { plainText, renderMarkdown } from "@/lib/markdown";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getService(slug);
  if (!s) return {};
  return pageMetadata({
    title: s.seoTitle || `${s.title} in Nepal`,
    description: s.seoDescription || s.summary || plainText(s.body),
    path: `/services/${s.slug}`,
  });
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const [service, all, settings] = await Promise.all([getService(slug), getServices(), getSettings()]);
  if (!service) notFound();
  const others = all.filter((s) => s.slug !== service.slug);

  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, { href: "/services", label: "What we do" }, { label: service.title }]}
        eyebrow="Service"
        title={<>{service.title}<Dot /></>}
        lede={service.summary}
      >
        <Link href={`/contact?service=${encodeURIComponent(service.title)}`} className="btn-accent mt-10">
          Talk to an expert <ArrowRight />
        </Link>
      </PageHero>

      <section className="bg-white">
        <div className="container-site flex flex-col gap-16 py-20 sm:py-28 lg:flex-row lg:gap-24">
          <article className="prose-tb min-w-0 lg:flex-[1_1_720px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(service.body) }} />
          {service.highlights.length > 0 && (
            <aside className="min-w-0 lg:sticky lg:top-32 lg:flex-[0_1_380px] lg:self-start">
              <div className="border-t-[3px] border-accent bg-mist p-8">
                <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.14em]">At a glance</h2>
                <ul className="space-y-3.5">
                  {service.highlights.map((h) => (
                    <li key={h} className="flex gap-3 text-base">
                      <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </section>

      <section className="bg-mist">
        <div className="container-site flex flex-col gap-14 py-20 sm:py-28 lg:flex-row lg:gap-24">
          <div className="min-w-0 lg:flex-[1_1_380px]">
            <p className="eyebrow mb-5">Get started</p>
            <h2 className="h-section text-[clamp(2rem,3.6vw,3rem)]">Discuss {service.title.toLowerCase()} with our team<Dot /></h2>
            <p className="mt-6 text-lg leading-relaxed text-muted">
              Tell us what you need. We&apos;ll reply within one working day — or call {settings.phonePrimary}.
            </p>
          </div>
          <div className="min-w-0 lg:flex-[1_1_560px]">
            <LeadForm services={all.map((s) => s.title)} defaultService={service.title} source={`service:${service.slug}`} />
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section className="bg-white">
          <div className="container-site py-20 sm:py-24">
            <h2 className="eyebrow mb-8">More services</h2>
            <ul className="grid border-t border-ink sm:grid-cols-2 lg:grid-cols-3">
              {others.map((o) => (
                <li key={o.id} className="border-b border-line">
                  <Link href={`/services/${o.slug}`} className="group flex items-center justify-between gap-4 py-6 pr-4">
                    <span className="font-display text-xl font-medium group-hover:underline group-hover:underline-offset-4">{o.title}</span>
                    <ArrowRight className="shrink-0 text-accent-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <CtaBand />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.title,
          description: service.summary,
          serviceType: service.title,
          url: siteUrl(`/services/${service.slug}`),
          provider: { "@id": siteUrl("/#organization") },
          areaServed: { "@type": "Country", name: "Nepal" },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "What we do", path: "/services" },
          { name: service.title, path: `/services/${service.slug}` },
        ])}
      />
    </>
  );
}
