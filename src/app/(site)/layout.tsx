import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { JsonLd } from "@/components/site/sections";
import { getIndustries, getServices, getSettings } from "@/lib/data";
import { organizationJsonLd } from "@/lib/seo";

// Render at request time from cached database content, so builds never
// need a database and admin edits appear immediately.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, services, industries, org] = await Promise.all([
    getSettings(),
    getServices(),
    getIndustries(),
    organizationJsonLd(),
  ]);
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-ink focus:px-4 focus:py-3 focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader
        services={services.map((s) => ({ href: `/services/${s.slug}`, label: s.title }))}
        industries={industries.map((s) => ({ href: `/industries/${s.slug}`, label: s.title }))}
      />
      <main id="main">{children}</main>
      <SiteFooter settings={settings} services={services} industries={industries} />
      <JsonLd data={org} />
    </>
  );
}
