import type { Metadata } from "next";
import { MailIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { Dot, JsonLd, PageHero } from "@/components/site/sections";
import { LeadForm } from "@/components/site/forms";
import { getServices, getSettings } from "@/lib/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { telHref } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Contact Tech Bucket — IT Consulting in Kathmandu",
    description: "Talk to Tech Bucket about IT consulting, cybersecurity, networks, cloud or managed support. We reply within one working day.",
    path: "/contact",
  });
}

type Props = { searchParams: Promise<{ service?: string }> };

export default async function ContactPage({ searchParams }: Props) {
  const [{ service }, settings, services] = await Promise.all([searchParams, getSettings(), getServices()]);
  const titles = services.map((s) => s.title);
  const preselect = service ? titles.find((t) => t.toLowerCase().includes(service.toLowerCase())) : undefined;

  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, { label: "Contact" }]}
        eyebrow="Contact"
        title={<>Let&apos;s talk about your next IT investment<Dot /></>}
        lede="Free consultation: we assess what you have, what you need and what can wait — then give you a prioritised plan that fits your budget."
      />
      <section className="bg-white">
        <div className="container-site flex flex-col gap-16 py-20 sm:py-28 lg:flex-row lg:gap-28">
          <div className="min-w-0 lg:flex-[1_1_560px]">
            <h2 className="mb-10 font-display text-3xl font-medium tracking-[-0.015em]">Send us an enquiry</h2>
            <LeadForm services={titles} defaultService={preselect} source="contact" />
          </div>
          <aside className="min-w-0 space-y-10 lg:flex-[0_1_400px]">
            <div className="border-t-[3px] border-accent bg-mist p-8">
              <h2 className="mb-6 text-[13px] font-semibold uppercase tracking-[0.14em]">Office</h2>
              <ul className="space-y-5 text-base">
                <li className="flex gap-4">
                  <PinIcon className="mt-0.5 shrink-0 text-accent-ink" />
                  <span>
                    {settings.companyName}
                    <br />
                    {settings.address}
                    <br />
                    {settings.addressRegion}, Nepal
                  </span>
                </li>
                <li className="flex gap-4">
                  <PhoneIcon className="mt-0.5 shrink-0 text-accent-ink" />
                  <span className="flex flex-col">
                    <a href={telHref(settings.phonePrimary)} className="font-semibold hover:underline">{settings.phonePrimary}</a>
                    {settings.phoneSecondary && (
                      <a href={telHref(settings.phoneSecondary)} className="font-semibold hover:underline">{settings.phoneSecondary}</a>
                    )}
                  </span>
                </li>
                <li className="flex gap-4">
                  <MailIcon className="mt-0.5 shrink-0 text-accent-ink" />
                  <a href={`mailto:${settings.email}`} className="font-semibold break-all hover:underline">{settings.email}</a>
                </li>
              </ul>
            </div>
            <div className="border-t border-ink pt-6">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em]">Support</h2>
              <p className="text-base leading-relaxed text-muted">
                Existing AMC customers: our support line is available 24/7, 365 days a year.
              </p>
            </div>
          </aside>
        </div>
      </section>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])} />
    </>
  );
}
