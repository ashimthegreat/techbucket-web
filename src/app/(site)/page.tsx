import Link from "next/link";
import type { Metadata } from "next";
import { ArcMotif, ArrowRight, SecurityLayers } from "@/components/icons";
import { Dot, SectionIntro, TypeTile } from "@/components/site/sections";
import { LeadForm } from "@/components/site/forms";
import {
  getClients,
  getFeatured,
  getIndustries,
  getPartners,
  getPosts,
  getServices,
  getSettings,
  getStats,
} from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import { cn, formatDate, telHref } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ path: "/" });
}

const tones = ["accent", "light", "dark"] as const;

export default async function HomePage() {
  const [settings, featured, stats, services, industries, clients, partners, posts] = await Promise.all([
    getSettings(),
    getFeatured(),
    getStats(),
    getServices(),
    getIndustries(),
    getClients(),
    getPartners(),
    getPosts(undefined, 3),
  ]);
  const homeClients = clients.filter((c) => c.showOnHome);
  const otherClients = clients.length - homeClients.length;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-deep text-white">
        <ArcMotif className="pointer-events-none absolute -top-[360px] -right-[600px] h-[1000px] w-[1000px] opacity-40 sm:-right-[560px] sm:opacity-70 md:-right-[480px] lg:-top-[300px] lg:-right-[260px] lg:opacity-100" />
        <div className={cn("container-site relative pt-16 sm:pt-24 lg:pt-28", featured.length ? "pb-44 sm:pb-48 lg:pb-52" : "pb-24")}>
          <div className="mb-8 flex items-center gap-3.5 sm:mb-9">
            <span aria-hidden="true" className="h-[3px] w-10 shrink-0 bg-accent" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#e4e8ea] sm:text-sm">
              {settings.heroEyebrow}
            </span>
          </div>
          <h1 className="h-display max-w-[1100px] text-[clamp(3rem,7.4vw,7rem)]">
            {settings.heroTitle.replace(/\.$/, "")}
            <Dot />
          </h1>
          <div className="mt-10 flex flex-col gap-10 lg:mt-12 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-[600px] text-lg leading-relaxed text-[#d9dee1] sm:text-[21px]">{settings.heroSubtitle}</p>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link href="/contact" className="btn-accent">
                Let&apos;s talk <ArrowRight />
              </Link>
              <Link href="/services" className="link-underline py-3 text-base text-white">
                See what we do
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section aria-label="Featured" className="relative -mt-28 sm:-mt-32">
          <div className="container-site grid gap-0.5 md:grid-cols-3">
            {featured.map((f) => {
              const dark = f.theme === "dark";
              return (
                <Link
                  key={f.id}
                  href={f.href}
                  className={cn(
                    "group flex min-h-[220px] flex-col gap-4 p-7 shadow-[0_12px_40px_rgba(10,14,17,0.12)] sm:p-9 lg:min-h-[250px]",
                    dark ? "bg-charcoal text-white" : "bg-white text-ink",
                  )}
                >
                  <span className={cn("text-[13px] font-semibold uppercase tracking-[0.14em]", dark ? "text-accent-soft" : "text-accent-ink")}>
                    {f.kicker}
                  </span>
                  <span className="flex-1 font-display text-[22px] leading-[1.22] font-medium tracking-[-0.01em] group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4 sm:text-[26px]">
                    {f.title}
                  </span>
                  <span className="flex items-center gap-2.5 text-[15px] font-semibold">
                    {f.ctaLabel} <ArrowRight className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Who we are */}
      <section className="bg-white">
        <div className="container-site py-24 sm:py-32 lg:py-36">
          <p className="eyebrow mb-8 sm:mb-10">Who we are</p>
          <p className="max-w-[1180px] font-display text-[clamp(1.75rem,3.4vw,3rem)] leading-[1.2] tracking-[-0.02em] text-ink">
            {settings.aboutStatement} <span className="text-[#7a858c]">{settings.aboutStatementMuted}</span>
          </p>
          {stats.length > 0 && (
            <dl className="mt-16 grid grid-cols-2 border-t border-ink sm:mt-24 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.id} className="pt-7 pr-6 pb-2 sm:pt-8">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-display text-[clamp(3rem,6vw,4.5rem)] leading-none font-medium tracking-[-0.04em]">
                    {s.value}
                    {s.suffix && <span className="text-accent">{s.suffix}</span>}
                  </dd>
                  <dd className="mt-3 text-[15px] text-muted sm:mt-4 sm:text-base">{s.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* What we do */}
      <section className="bg-mist">
        <div className="container-site flex flex-col gap-14 py-24 sm:py-32 lg:flex-row lg:gap-24 lg:py-36">
          <div className="min-w-0 lg:sticky lg:top-32 lg:max-w-[440px] lg:flex-[1_1_340px] lg:self-start">
            <p className="eyebrow mb-6">What we do</p>
            <h2 className="h-section">
              One partner, from strategy to support<Dot />
            </h2>
            <p className="mt-7 text-lg leading-relaxed text-slate">
              Vendor-neutral advice first. Then delivery with a rollback plan, joint acceptance testing, and support long after go-live.
            </p>
            <Link href="/contact" className="link-underline mt-9 inline-block text-base">
              Book a free consultation
            </Link>
          </div>
          <ol className="min-w-0 border-t border-ink lg:flex-[999_1_560px]">
            {services.map((s, i) => (
              <li key={s.id} className="border-b border-line">
                <Link href={`/services/${s.slug}`} className="group flex items-start gap-5 py-7 sm:gap-7 sm:py-8">
                  <span className="w-8 shrink-0 pt-2 text-sm font-semibold text-subtle">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <span className="font-display text-[clamp(1.4rem,2.4vw,2rem)] leading-[1.15] font-medium tracking-[-0.015em]">{s.title}</span>
                    <span className="max-w-[620px] text-base leading-relaxed text-muted">{s.summary}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink transition-colors group-hover:border-accent group-hover:bg-accent sm:flex"
                  >
                    <ArrowRight size={18} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Security */}
      <section className="flex flex-col bg-ink text-white lg:flex-row">
        <div className="flex items-center justify-center bg-night px-6 py-14 sm:px-10 lg:flex-[1_1_480px] lg:py-16">
          <SecurityLayers className="h-auto w-full max-w-[520px]" />
        </div>
        <div className="min-w-0 px-5 py-20 sm:px-10 lg:flex-[1_1_560px] lg:px-[clamp(2rem,6vw,6rem)] lg:py-32">
          <p className="eyebrow mb-6 text-accent-soft">Cybersecurity</p>
          <h2 className="h-section">How safe are you?</h2>
          <p className="mt-7 max-w-[560px] text-lg leading-relaxed text-fog">
            Firewalls and passwords alone are not enough. We secure every layer — network, data, identity, email, endpoint and the physical perimeter — and monitor it around the clock.
          </p>
          <Link href="/contact?service=Cybersecurity" className="btn-accent mt-10">
            Request a security assessment <ArrowRight />
          </Link>
          <Link href="/services/cybersecurity" className="link-underline mt-6 block w-fit text-base text-white sm:ml-7 sm:mt-0 sm:inline-block">
            Our security services
          </Link>
        </div>
      </section>

      {/* Industries */}
      <section className="bg-white">
        <div className="container-site pt-24 sm:pt-32 lg:pt-36">
          <SectionIntro
            eyebrow="Industries"
            title={<>Where uptime is not optional<Dot /></>}
            link={{ href: "/industries", label: "All industries" }}
          />
        </div>
        <div className="container-site grid gap-x-8 pt-14 pb-24 sm:grid-cols-2 sm:pt-16 sm:pb-32 lg:grid-cols-4 lg:pb-36">
          {industries.map((ind, i) => (
            <Link
              key={ind.id}
              href={`/industries/${ind.slug}`}
              className={cn(
                "group flex flex-col gap-5 border-t-[3px] pt-8 pb-12 lg:min-h-[340px]",
                i === 0 ? "border-accent" : "border-ink",
              )}
            >
              <span className="text-sm font-semibold text-subtle">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-[28px] leading-[1.1] font-medium tracking-[-0.02em] group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4 sm:text-[30px]">
                {ind.title}
              </span>
              <span className="flex-1 text-base leading-relaxed text-muted">{ind.summary}</span>
              <span className="flex items-center gap-2 text-[15px] font-semibold">
                Explore <ArrowRight className="text-accent-ink transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Clients */}
      {homeClients.length > 0 && (
        <section className="bg-mist">
          <div className="container-site py-24 sm:py-28 lg:py-32">
            <SectionIntro
              eyebrow="Our clients"
              title="Trusted by the institutions Nepal depends on."
              link={{ href: "/case-studies", label: "Read case studies" }}
              className="mb-14 sm:mb-16"
            />
            <ul aria-label="Selected clients" className="grid grid-cols-2 border-y border-line sm:grid-cols-4 xl:grid-cols-8">
              {homeClients.map((c) => (
                <li key={c.id} className="group flex h-28 items-center justify-center px-4 text-center sm:h-32">
                  {c.logoUrl ? (
                    // mix-blend-multiply drops a logo's white background into the grey band,
                    // so logos uploaded as JPG/PNG on white blend in cleanly.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logoUrl}
                      alt={c.name}
                      title={c.name}
                      loading="lazy"
                      className="max-h-14 w-auto max-w-[150px] object-contain opacity-75 mix-blend-multiply grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                    />
                  ) : (
                    <span className="font-display text-[15px] leading-tight font-semibold tracking-[-0.01em] text-slate sm:text-[17px]">{c.name}</span>
                  )}
                </li>
              ))}
            </ul>
            {otherClients > 0 && (
              <p className="mt-8 text-base text-muted">
                Plus {otherClients} more hospitals, enterprises and organisations across Nepal.{" "}
                <Link href="/about#clients" className="font-semibold text-ink underline underline-offset-4">See all clients</Link>
              </p>
            )}
          </div>
        </section>
      )}

      {/* How we work */}
      <section className="bg-white">
        <div className="container-site flex flex-col gap-14 py-24 sm:py-32 lg:flex-row lg:gap-24 lg:py-36">
          <div className="min-w-0 lg:max-w-[520px] lg:flex-[1_1_380px]">
            <p className="eyebrow mb-6">How we work with you</p>
            <h2 className="h-section">
              Advise. Deliver. Run<Dot />
            </h2>
          </div>
          <div className="grid min-w-0 gap-12 sm:grid-cols-3 sm:gap-10 lg:flex-[999_1_560px]">
            {[
              ["Advise", "Free, vendor-neutral assessment of what you have, what you need and what can wait — prioritised to your budget."],
              ["Deliver", "Supply, deployment and integration with a rollback plan, joint testing and complete handover documentation."],
              ["Run", "Annual maintenance and managed support: 24/7 line, weekly on-site follow-ups and monthly health reports."],
            ].map(([t, d], i) => (
              <div key={t} className={cn("border-t-[3px] pt-7", i === 2 ? "border-accent" : "border-ink")}>
                <h3 className="mb-3 font-display text-[26px] font-medium tracking-[-0.01em]">{t}</h3>
                <p className="text-base leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Insights */}
      {posts.length > 0 && (
        <section className="bg-mist">
          <div className="container-site py-24 sm:py-32 lg:py-36">
            <SectionIntro
              eyebrow="Insights"
              title="Thinking from the field."
              link={{ href: "/insights", label: "View all insights" }}
              className="mb-14"
            />
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => (
                <Link key={p.id} href={`/${p.type === "case_study" ? "case-studies" : "insights"}/${p.slug}`} className="group flex flex-col bg-white">
                  {p.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverUrl} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
                  ) : (
                    <TypeTile headline={p.coverHeadline || p.category || p.title} tone={tones[i % 3]} />
                  )}
                  <div className="flex flex-1 flex-col gap-3.5 p-7">
                    <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-ink">
                      {p.type === "case_study" ? "Case study" : p.category || "Insight"}
                    </span>
                    <span className="font-display text-2xl leading-tight font-medium group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
                      {p.title}
                    </span>
                    <span className="mt-auto text-sm text-subtle">
                      {formatDate(p.publishedAt)} · {p.readMinutes} min read
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Partners */}
      {partners.length > 0 && (
        <section aria-label="Technology partners" className="border-y border-hair bg-white">
          <div className="container-site flex flex-col gap-6 py-12 lg:flex-row lg:items-center lg:gap-12">
            <span className="eyebrow shrink-0">Technology partners</span>
            <ul className="flex flex-wrap gap-x-9 gap-y-3.5">
              {partners.map((p) => (
                <li key={p.id} className="font-display text-lg font-semibold text-slate sm:text-[19px]">
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logoUrl} alt={p.name} className="h-8 w-auto mix-blend-multiply grayscale" loading="lazy" />
                  ) : (
                    p.name
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Careers */}
      <section className="bg-accent text-ink">
        <div className="container-site flex flex-col gap-10 py-24 sm:py-28 lg:flex-row lg:items-end lg:justify-between lg:gap-24 lg:py-36">
          <div className="min-w-0 lg:flex-[1_1_640px]">
            <p className="mb-6 text-sm font-bold uppercase tracking-[0.16em]">Careers</p>
            <h2 className="h-display max-w-[1000px] text-[clamp(2.6rem,6vw,5.5rem)]">Do the work that keeps a country connected.</h2>
          </div>
          <Link href="/careers" className="btn-ink shrink-0 self-start lg:self-end">
            See open roles <ArrowRight />
          </Link>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-white">
        <div className="container-site flex flex-col gap-16 py-24 sm:py-32 lg:flex-row lg:gap-28 lg:py-36">
          <div className="min-w-0 lg:flex-[1_1_400px]">
            <h2 className="h-section">
              Let&apos;s talk about your next IT investment<Dot />
            </h2>
            <div className="mt-12 grid gap-10 text-base leading-[1.75] text-slate sm:mt-16 sm:grid-cols-2">
              <div>
                <h3 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink">Office</h3>
                {settings.address}, Nepal
                <br />
                <a className="text-accent-ink hover:underline" href={telHref(settings.phonePrimary)}>{settings.phonePrimary}</a>
                {settings.phoneSecondary && (
                  <>
                    <br />
                    <a className="text-accent-ink hover:underline" href={telHref(settings.phoneSecondary)}>{settings.phoneSecondary}</a>
                  </>
                )}
              </div>
              <div>
                <h3 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink">Email</h3>
                <a className="text-accent-ink hover:underline" href={`mailto:${settings.email}`}>{settings.email}</a>
                <br />
                Support available 24/7
              </div>
            </div>
          </div>
          <div className="min-w-0 lg:flex-[1_1_520px]">
            <LeadForm services={services.map((s) => s.title)} source="home" />
          </div>
        </div>
      </section>
    </>
  );
}
