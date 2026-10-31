import "server-only";
import type { Metadata } from "next";
import { siteUrl } from "@/lib/utils";
import { getSettings } from "@/lib/data";

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

export async function organizationJsonLd() {
  const s = await getSettings();
  const sameAs = Object.values(s.socials ?? {}).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": siteUrl("/#organization"),
    name: s.companyName,
    alternateName: "Tech Bucket",
    url: siteUrl("/"),
    logo: siteUrl("/logo.png"),
    email: s.email,
    telephone: s.phonePrimary,
    foundingDate: s.foundedYear ? String(s.foundedYear) : undefined,
    vatID: s.vatNumber ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address,
      addressLocality: s.addressLocality,
      addressRegion: s.addressRegion,
      addressCountry: "NP",
    },
    areaServed: { "@type": "Country", name: "Nepal" },
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
