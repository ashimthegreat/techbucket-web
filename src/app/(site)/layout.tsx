import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { JsonLd } from "@/components/site/sections";
import { getIndustries, getServices, getSettings } from "@/lib/data";
import type { Metadata } from "next";
import { organizationJsonLd } from "@/lib/seo";
import { ChatWidget } from "@/components/site/chat-widget";

// Render at request time from cached database content, so builds never
// need a database and admin edits appear immediately.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    verification: {
      ...(s.googleVerification ? { google: s.googleVerification } : {}),
      ...(s.bingVerification ? { other: { "msvalidate.01": s.bingVerification } } : {}),
    },
  };
}

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
      {settings.chatEnabled && (
        <ChatWidget
          companyName={settings.companyName}
          ai={!!settings.chatAiKeyEnc}
          teaser="Namaste! Looking for CCTV, networking, security or software? Ask me and I'll point you the right way."
        />
      )}
    </>
  );
}
