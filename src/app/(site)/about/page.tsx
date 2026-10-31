import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "@/components/icons";
import { CtaBand, Dot, JsonLd, PageHero, SectionIntro } from "@/components/site/sections";
import { getClients, getPartners, getSettings, getStats } from "@/lib/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "About Tech Bucket — IT Consulting & Infrastructure Firm in Kathmandu",
    description:
      "Founded in 2019, Tech Bucket is a vendor-neutral IT consulting, cybersecurity and infrastructure firm serving hospitals, development partners, public institutions and enterprises across Nepal.",
    path: "/about",
  });
}

export default async function AboutPage() {
  const [settings, stats, clients, partners] = await Promise.all([getSettings(), getStats(), getClients(), getPartners()]);
  const bySector = clients.reduce<Record<string, string[]>>((acc, c) => {
    const key = c.sector || "Other";
    (acc[key] ??= []).push(c.name);
    return acc;
  }, {});

  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, { label: "About us" }]}
        eyebrow="About us"
        title={<>Technology that serves the business — not the other way round<Dot /></>}
      />

      <section className="bg-white">
        <div className="container-site py-20 sm:py-28">
          <p className="max-w-[1180px] font-display text-[clamp(1.75rem,3.4vw,3rem)] leading-[1.2] tracking-[-0.02em]">
            {settings.aboutStatement} <span className="text-[#7a858c]">{settings.aboutStatementMuted}</span>
          </p>
          <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-24">
            <div className="space-y-6 text-lg leading-[1.75] text-slate">
              {settings.aboutBody.split(/\n\s*\n/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {stats.length > 0 && (
              <dl className="grid grid-cols-2 content-start border-t border-ink">
                {stats.map((s) => (
                  <div key={s.id} className="border-b border-hair py-7 pr-6">
                    <dd className="font-display text-5xl leading-none font-medium tracking-[-0.04em]">
                      {s.value}
                      {s.suffix && <span className="text-accent">{s.suffix}</span>}
                    </dd>
                    <dt className="mt-3 text-base text-muted">{s.label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="container-site grid gap-px py-20 sm:py-28 md:grid-cols-3">
          <div className="border-t-[3px] border-accent pt-8 md:pr-10">
            <h2 className="mb-4 font-display text-[28px] font-medium">Our mission</h2>
            <p className="text-lg leading-relaxed text-fog">{settings.mission}</p>
          </div>
          <div className="border-t-[3px] border-white pt-8 md:px-10">
            <h2 className="mb-4 font-display text-[28px] font-medium">Our vision</h2>
            <p className="text-lg leading-relaxed text-fog">{settings.vision}</p>
          </div>
          <div className="border-t-[3px] border-white pt-8 md:pl-10">
            <h2 className="mb-4 font-display text-[28px] font-medium">Our values</h2>
            <ul className="space-y-3 text-lg">
              {settings.values.map((v) => (
                <li key={v} className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-site py-20 sm:py-28">
          <SectionIntro
            eyebrow="Why Tech Bucket"
            title={<>Customer-centric, vendor-neutral, always on<Dot /></>}
            className="mb-14"
          />
          <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Experienced team", "IT specialists with years of industry experience across networking, security and software."],
              ["Customer-centric", "We focus on fulfilling your needs, not on pushing a particular product."],
              ["24/7 availability", "Support available around the clock, 365 days a year."],
              ["Exceptional value", "Automated deployments and in-house product customisation."],
              ["Transparency", "Clear, upfront costs — including shipping and delivery charges."],
              ["Privacy & protection", "The security and privacy of our customers is our top priority."],
            ].map(([t, d], i) => (
              <div key={t} className="flex gap-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-wash text-base font-bold text-accent-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="mb-2 font-display text-xl font-semibold">{t}</h3>
                  <p className="text-base leading-relaxed text-muted">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="clients" className="scroll-mt-24 bg-mist">
        <div className="container-site py-20 sm:py-28">
          <SectionIntro eyebrow="Our clients" title="Organisations we have worked with." className="mb-14" />
          <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(bySector).map(([sector, names]) => (
              <div key={sector} className="border-t border-ink pt-5">
                <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-subtle">{sector}</h3>
                <ul className="space-y-2.5">
                  {names.map((n) => (
                    <li key={n} className="font-display text-lg font-medium">{n}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {partners.length > 0 && (
        <section className="bg-white">
          <div className="container-site py-20 sm:py-24">
            <SectionIntro
              eyebrow="Technology partners"
              title="Brands we supply, deploy and support."
              aside="Not tied to one vendor — we recommend what fits your environment and budget."
              className="mb-12"
            />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {partners.map((p) => (
                <li key={p.id} className="flex h-24 items-center justify-center border border-hair px-3 text-center font-display text-base font-semibold text-slate">
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logoUrl} alt={p.name} className="max-h-10 w-auto mix-blend-multiply grayscale" loading="lazy" />
                  ) : (
                    p.name
                  )}
                </li>
              ))}
            </ul>
            <Link href="/careers" className="mt-14 inline-flex items-center gap-2 text-base font-semibold">
              Join our team <ArrowRight className="text-accent-ink" />
            </Link>
          </div>
        </section>
      )}

      <CtaBand />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About us", path: "/about" }])} />
    </>
  );
}
