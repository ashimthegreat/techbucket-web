import Link from "next/link";
import Image from "next/image";
import type { Industry, Service, SiteSettings } from "@/db/schema";
import { telHref } from "@/lib/utils";

type Settings = Omit<SiteSettings, "updatedAt"> & { updatedAt: string };

export function SiteFooter({
  settings,
  services,
  industries,
}: {
  settings: Settings;
  services: Pick<Service, "slug" | "title">[];
  industries: Pick<Industry, "slug" | "title">[];
}) {
  const year = new Date().getFullYear();
  const col = "mb-5 text-[13px] font-semibold uppercase tracking-[0.14em] text-white";
  const link = "text-[15px] text-[#a9b3b9] transition-colors hover:text-white";
  return (
    <footer className="bg-night text-[#a9b3b9]">
      <div className="container-site grid gap-14 py-20 lg:grid-cols-[1.1fr_2fr] lg:gap-20 lg:py-24">
        <div className="flex flex-col gap-6">
          <Image src="/logo-light.png" alt="Tech Bucket" width={658} height={255} className="h-12 w-auto self-start" />
          <p className="max-w-sm font-display text-[26px] leading-tight tracking-[-0.01em] text-white">
            {settings.tagline.replace(/\.$/, "")}
            <span className="text-accent">.</span>
          </p>
          <address className="space-y-1.5 text-[15px] not-italic leading-relaxed">
            <div>{settings.address}, {settings.addressRegion}, Nepal</div>
            <div>
              <a className="hover:text-white" href={telHref(settings.phonePrimary)}>{settings.phonePrimary}</a>
              {settings.phoneSecondary && (
                <>
                  {" · "}
                  <a className="hover:text-white" href={telHref(settings.phoneSecondary)}>{settings.phoneSecondary}</a>
                </>
              )}
            </div>
            <div>
              <a className="hover:text-white" href={`mailto:${settings.email}`}>{settings.email}</a>
            </div>
          </address>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div>
            <h2 className={col}>What we do</h2>
            <ul className="space-y-3">
              {services.map((s) => (
                <li key={s.slug}><Link className={link} href={`/services/${s.slug}`}>{s.title}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={col}>Industries</h2>
            <ul className="space-y-3">
              {industries.map((s) => (
                <li key={s.slug}><Link className={link} href={`/industries/${s.slug}`}>{s.title}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={col}>Company</h2>
            <ul className="space-y-3">
              <li><Link className={link} href="/about">About us</Link></li>
              <li><Link className={link} href="/case-studies">Case studies</Link></li>
              <li><Link className={link} href="/insights">Insights</Link></li>
              <li><Link className={link} href="/careers">Careers</Link></li>
              <li><Link className={link} href="/contact">Contact</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-[#263036]">
        <div className="container-site flex flex-col gap-3 py-7 text-[13px] sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {settings.companyName}
            {settings.vatNumber ? ` · VAT No. ${settings.vatNumber}` : ""}
          </span>
          <span className="flex flex-wrap gap-6">
            <Link className="hover:text-white" href="/privacy">Privacy</Link>
            <Link className="hover:text-white" href="/terms">Terms</Link>
            <Link className="hover:text-white" href="/sitemap.xml">Sitemap</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
