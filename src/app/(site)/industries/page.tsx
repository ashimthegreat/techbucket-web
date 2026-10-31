import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "@/components/icons";
import { CtaBand, Dot, JsonLd, PageHero } from "@/components/site/sections";
import { getIndustries } from "@/lib/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Industries — Healthcare, Development Partners, Public Sector & Enterprise",
    description:
      "IT, network and security expertise for hospitals, donor-funded programmes, public institutions, universities and enterprises in Nepal.",
    path: "/industries",
  });
}

export default async function IndustriesPage() {
  const industries = await getIndustries();
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, { label: "Industries" }]}
        eyebrow="Industries"
        title={<>Where uptime is not optional<Dot /></>}
        lede="We bring deep experience in sectors where systems must stay up, data must stay safe and work must stand up to audit."
      />
      <section className="bg-white">
        <div className="container-site py-20 sm:py-28">
          {industries.map((ind, i) => (
            <Link
              key={ind.id}
              href={`/industries/${ind.slug}`}
              className={cn(
                "group grid gap-6 border-t-[3px] py-10 sm:py-12 lg:grid-cols-[80px_1fr_1.3fr_auto] lg:gap-10",
                i === 0 ? "border-accent" : "border-ink",
              )}
            >
              <span className="text-sm font-semibold text-subtle">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.05] font-medium tracking-[-0.02em] group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
                {ind.title}
              </h2>
              <div className="space-y-4">
                <p className="text-lg leading-relaxed text-muted">{ind.summary}</p>
                {ind.clientsText && (
                  <p className="text-sm leading-relaxed text-subtle">
                    <span className="font-semibold text-ink">Clients include: </span>
                    {ind.clientsText}
                  </p>
                )}
              </div>
              <span aria-hidden="true" className="hidden h-12 w-12 items-center justify-center rounded-full border border-ink transition-colors group-hover:border-accent group-hover:bg-accent lg:flex">
                <ArrowRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <CtaBand />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Industries", path: "/industries" }])} />
    </>
  );
}
