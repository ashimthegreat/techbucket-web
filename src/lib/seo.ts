import "server-only";
import type { Metadata } from "next";
import { siteUrl } from "@/lib/utils";
import { getServices, getSettings } from "@/lib/data";

export async function pageMetadata({
  title,
  description,
  path,
  type = "website",
  publishedTime,
  image,
}: {
  title?: string;
  description?: string;
  path: string;
  type?: "website" | "article";
  publishedTime?: string | null;
  image?: string | null;
}): Promise<Metadata> {
  const s = await getSettings();
  const desc = description || s.defaultSeoDescription;
  const fullTitle = title ? `${title} | Tech Bucket` : s.defaultSeoTitle;
  const url = siteUrl(path);
  const images = image ? [{ url: image.startsWith("http") ? image : siteUrl(image) }] : undefined;
  return {
    title: title ? { absolute: fullTitle } : { absolute: s.defaultSeoTitle },
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      title: fullTitle,
      description: desc,
      siteName: s.companyName,
      locale: "en_US",
      ...(images ? { images } : {}),
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: desc },
  };
}

/**
 * Site-wide structured data: the company (as an Organization that is also a local
 * ProfessionalService, so it can show for "IT company near me"-type searches) and
 * the website itself. AI search engines use this to tie facts and mentions to one entity.
 */
export async function organizationJsonLd() {
  const [s, services] = await Promise.all([getSettings(), getServices()]);
  const sameAs = Object.values(s.socials ?? {}).filter(Boolean);
  if (s.mapUrl) sameAs.push(s.mapUrl);
  const hours = (s.openingHours ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const org = {
    "@type": ["Organization", "ProfessionalService"],
    "@id": siteUrl("/#organization"),
    name: s.companyName,
    alternateName: "Tech Bucket",
    description: s.defaultSeoDescription,
    slogan: s.tagline || undefined,
    url: siteUrl("/"),
    logo: { "@type": "ImageObject", url: siteUrl("/logo.png") },
    image: siteUrl("/opengraph-image"),
    email: s.email,
    telephone: s.phonePrimary,
    foundingDate: s.foundedYear ? String(s.foundedYear) : undefined,
    vatID: s.vatNumber ?? undefined,
    taxID: s.vatNumber ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address,
      addressLocality: s.addressLocality,
      addressRegion: s.addressRegion,
      addressCountry: "NP",
    },
    ...(s.latitude && s.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: Number(s.latitude), longitude: Number(s.longitude) } }
      : {}),
    ...(s.mapUrl ? { hasMap: s.mapUrl } : {}),
    ...(hours.length ? { openingHours: hours } : {}),
    areaServed: { "@type": "Country", name: "Nepal" },
    knowsAbout: services.map((x) => x.title),
    makesOffer: services.map((x) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: x.title, url: siteUrl(`/services/${x.slug}`) },
    })),
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: s.phonePrimary,
        email: s.email,
        contactType: "sales",
        areaServed: "NP",
        availableLanguage: ["English", "Nepali"],
      },
    ],
    ...(sameAs.length ? { sameAs } : {}),
  };
  const website = {
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    url: siteUrl("/"),
    name: s.companyName,
    alternateName: "Tech Bucket",
    inLanguage: "en",
    publisher: { "@id": siteUrl("/#organization") },
  };
  return { "@context": "https://schema.org", "@graph": [org, website] };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: siteUrl(it.path),
    })),
  };
}
