import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "@/components/icons";
import { CtaBand, Dot, JsonLd, PageHero } from "@/components/site/sections";
import { getIndustries, getIndustry, getServices } from "@/lib/data";
import { plainText, renderMarkdown } from "@/lib/markdown";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ind = await getIndustry(slug);
  if (!ind) return {};
  return pageMetadata({
    title: ind.seoTitle || `IT Solutions for ${ind.title} in Nepal`,
    description: ind.seoDescription || ind.summary || plainText(ind.body),
    path: `/industries/${ind.slug}`,
  });
}

export default async function IndustryPage({ params }: Props) {
  const { slug } = await params;
  const [ind, all, services] = await Promise.all([getIndustry(slug), getIndustries(), getServices()]);
  if (!ind) notFound();
  const clientList = ind.clientsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, { href: "/industries", label: "Industries" }, { label: ind.title }]}
        eyebrow="Industry"
        title={<>{ind.title}<Dot /></>}
        lede={ind.summary}
      >
        <Link href="/contact" className="btn-accent mt-10">
          Talk to an expert <ArrowRight />
        </Link>
      </PageHero>

      <section className="bg-white">
        <div className="container-site flex flex-col gap-16 py-20 sm:py-28 lg:flex-row lg:gap-24">
          <article className="prose-tb min-w-0 lg:flex-[1_1_720px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(ind.body) }} />
          {clientList.length > 0 && (
            <aside className="min-w-0 lg:sticky lg:top-32 lg:flex-[0_1_380px] lg:self-start">
              <div className="border-t-[3px] border-accent bg-mist p-8">
                <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.14em]">Clients include</h2>
                <ul className="space-y-3">
                  {clientList.map((c) => (
                    <li key={c} className="border-b border-line pb-3 text-base font-medium last:border-0 last:pb-0">{c}</li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </section>

      <section className="bg-mist">
        <div className="container-site py-20 sm:py-24">
          <h2 className="h-section mb-12 text-[clamp(2rem,3.6vw,3rem)]">Relevant services<Dot /></h2>
          <ul className="grid border-t border-ink sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <li key={s.id} className="border-b border-line">
                <Link href={`/services/${s.slug}`} className="group flex items-center justify-between gap-4 py-6 pr-4">
                  <span className="font-display text-lg font-medium group-hover:underline group-hover:underline-offset-4">{s.title}</span>
                  <ArrowRight className="shrink-0 text-accent-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {all.length > 1 && (
        <section className="bg-white">
          <div className="container-site py-16 sm:py-20">
            <h2 className="eyebrow mb-6">Other industries</h2>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {all
                .filter((a) => a.slug !== ind.slug)
                .map((a) => (
                  <Link key={a.id} href={`/industries/${a.slug}`} className="link-underline font-display text-xl">
                    {a.title}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Industries", path: "/industries" },
          { name: ind.title, path: `/industries/${ind.slug}` },
        ])}
      />
    </>
  );
}
