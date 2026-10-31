import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "@/components/icons";
import { Dot, JsonLd, PageHero } from "@/components/site/sections";
import { ApplicationForm } from "@/components/site/forms";
import { getOpenJobs } from "@/lib/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Careers — IT, Network & Security Jobs in Kathmandu",
    description: "Join Tech Bucket. Open roles for network engineers, security analysts, developers and support engineers in Nepal.",
    path: "/careers",
  });
}

export default async function CareersPage() {
  const jobs = await getOpenJobs();
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, { label: "Careers" }]}
        eyebrow="Careers"
        title={<>Do the work that keeps a country connected<Dot /></>}
        lede="Build and protect the systems behind Nepal's hospitals, public institutions and enterprises — with a team that values getting things right."
      />
      <section className="bg-white">
        <div className="container-site py-20 sm:py-28">
          <h2 className="h-section mb-12 text-[clamp(2rem,3.6vw,3rem)]">Open roles<Dot /></h2>
          {jobs.length === 0 ? (
            <p className="border-t border-ink pt-8 text-lg text-muted">
              There are no open roles right now. We are always glad to hear from talented people — send a general application below.
            </p>
          ) : (
            <ul className="border-t border-ink">
              {jobs.map((j) => (
                <li key={j.id} className="border-b border-line">
                  <Link href={`/careers/${j.slug}`} className="group grid gap-3 py-8 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8">
                    <div>
                      <h3 className="font-display text-[clamp(1.4rem,2.4vw,2rem)] leading-tight font-medium group-hover:underline group-hover:underline-offset-4">{j.title}</h3>
                      <p className="mt-2 text-base text-muted">
                        {[j.department, j.location, j.employmentType].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="flex items-center gap-2 text-[15px] font-semibold">
                      View role <ArrowRight className="text-accent-ink" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section id="apply" className="bg-mist">
        <div className="container-site flex flex-col gap-14 py-20 sm:py-28 lg:flex-row lg:gap-24">
          <div className="min-w-0 lg:flex-[1_1_380px]">
            <p className="eyebrow mb-5">General application</p>
            <h2 className="h-section text-[clamp(2rem,3.6vw,3rem)]">Don&apos;t see your role? Tell us about yourself<Dot /></h2>
          </div>
          <div className="min-w-0 lg:flex-[1_1_560px]">
            <ApplicationForm />
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }])} />
    </>
  );
}
