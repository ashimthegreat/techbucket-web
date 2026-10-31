import Link from "next/link";
import { ArcMotif, ArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export function Dot({ className }: { className?: string }) {
  return <span className={cn("text-accent", className)}>.</span>;
}

export function SectionIntro({
  eyebrow,
  title,
  aside,
  link,
  dark,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  aside?: React.ReactNode;
  link?: { href: string; label: string };
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-24", className)}>
      <div className="min-w-0 lg:flex-[1_1_560px]">
        <p className={cn("eyebrow mb-5 sm:mb-6", dark && "text-accent-soft")}>{eyebrow}</p>
        <h2 className="h-section max-w-[900px]">{title}</h2>
      </div>
      {aside && <div className={cn("min-w-0 text-lg leading-relaxed lg:flex-[0_1_380px]", dark ? "text-fog" : "text-muted")}>{aside}</div>}
      {link && (
        <Link href={link.href} className={cn("link-underline shrink-0 text-base", dark ? "text-white" : "text-ink")}>
          {link.label}
        </Link>
      )}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8 text-sm text-fog">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {item.href ? (
              <Link href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-white">{item.label}</span>
            )}
            {i < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHero({
  eyebrow,
  title,
  lede,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  crumbs?: { href?: string; label: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-deep text-white">
      <ArcMotif className="pointer-events-none absolute -top-[340px] -right-[560px] h-[900px] w-[900px] opacity-50 sm:-right-[540px] md:-right-[480px] lg:-top-[300px] lg:-right-[360px] lg:h-[1000px] lg:w-[1000px] lg:opacity-100" />
      <div className="container-site relative pt-14 pb-20 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
        {crumbs && <Breadcrumbs items={crumbs} />}
        {eyebrow && (
          <div className="mb-7 flex items-center gap-3.5">
            <span aria-hidden="true" className="h-[3px] w-10 bg-accent" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#e4e8ea] sm:text-sm">{eyebrow}</span>
          </div>
        )}
        <h1 className="h-display max-w-[1000px] text-[clamp(2.6rem,6.2vw,5.5rem)]">{title}</h1>
        {lede && <p className="mt-8 max-w-[680px] text-lg leading-relaxed text-[#d9dee1] sm:text-xl">{lede}</p>}
        {children}
      </div>
    </section>
  );
}

export function CtaBand({
  title = "Let's talk about your next IT investment",
  body = "Free consultation: we assess what you have, what you need and what can wait — then give you a prioritised plan that fits your budget.",
  href = "/contact",
  label = "Talk to an expert",
}: {
  title?: string;
  body?: string;
  href?: string;
  label?: string;
}) {
  return (
    <section className="bg-accent text-ink">
      <div className="container-site flex flex-col gap-10 py-20 sm:py-24 lg:flex-row lg:items-end lg:justify-between lg:gap-24 lg:py-28">
        <div className="min-w-0 lg:flex-[1_1_640px]">
          <h2 className="h-display text-[clamp(2.4rem,5vw,4.5rem)]">{title}.</h2>
          <p className="mt-6 max-w-[620px] text-lg leading-relaxed">{body}</p>
        </div>
        <Link href={href} className="btn-ink shrink-0 self-start lg:self-end">
          {label} <ArrowRight />
        </Link>
      </div>
    </section>
  );
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here; escape "<" to prevent breaking out of the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function TypeTile({
  headline,
  tone,
  className,
}: {
  headline: string;
  tone: "accent" | "light" | "dark";
  className?: string;
}) {
  const bg = tone === "accent" ? "bg-accent text-ink" : tone === "light" ? "bg-hair text-ink" : "bg-ink text-white";
  const parts = headline.replace(/\.$/, "");
  return (
    <div aria-hidden="true" className={cn("flex aspect-[16/10] items-end p-6 sm:p-7", bg, className)}>
      <span className="font-display text-[clamp(2.4rem,4.4vw,4rem)] leading-[0.92] font-semibold tracking-[-0.04em] text-balance">
        {parts}
        <span className={tone === "accent" ? "text-ink" : tone === "light" ? "text-accent-ink" : "text-accent"}>.</span>
      </span>
    </div>
  );
}
