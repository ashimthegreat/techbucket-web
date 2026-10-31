import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Dot, JsonLd, PageHero } from "@/components/site/sections";
import { ApplicationForm } from "@/components/site/forms";
import { getJob, getSettings } from "@/lib/data";
import { plainText, renderMarkdown } from "@/lib/markdown";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatDate, siteUrl } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) return {};
  return pageMetadata({
    title: `${job.title} — Careers`,
    description: job.summary || plainText(job.body),
    path: `/careers/${job.slug}`,
  });
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const [job, settings] = await Promise.all([getJob(slug), getSettings()]);
  if (!job) notFound();
  const open = job.status === "open";

  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, { href: "/careers", label: "Careers" }, { label: job.title }]}
        eyebrow={[job.department, job.location, job.employmentType].filter(Boolean).join(" · ")}
        title={<>{job.title}<Dot /></>}
        lede={job.summary || undefined}
      >
        {job.closesAt && <p className="mt-8 text-sm text-fog">Applications close {formatDate(job.closesAt)}</p>}
      </PageHero>
      <section className="bg-white">
        <div className="container-site py-20 sm:py-28">
          <article className="prose-tb" dangerouslySetInnerHTML={{ __html: renderMarkdown(job.body) }} />
        </div>
      </section>
      <section id="apply" className="bg-mist">
        <div className="container-site flex flex-col gap-14 py-20 sm:py-28 lg:flex-row lg:gap-24">
          <div className="min-w-0 lg:flex-[1_1_380px]">
            <h2 className="h-section text-[clamp(2rem,3.6vw,3rem)]">{open ? "Apply for this role" : "This role is closed"}<Dot /></h2>
          </div>
          <div className="min-w-0 lg:flex-[1_1_560px]">
            {open ? <ApplicationForm jobId={job.id} /> : <p className="text-lg text-muted">See other open roles on our careers page.</p>}
          </div>
        </div>
      </section>
      {open && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: job.title,
            description: renderMarkdown(job.body || job.summary),
            datePosted: job.createdAt,
            ...(job.closesAt ? { validThrough: job.closesAt } : {}),
            employmentType: job.employmentType.toUpperCase().replace(/[^A-Z]/g, "_"),
            hiringOrganization: {
              "@type": "Organization",
              name: settings.companyName,
              sameAs: siteUrl("/"),
              logo: siteUrl("/logo.png"),
            },
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressLocality: job.location || settings.addressLocality,
                addressRegion: settings.addressRegion,
                addressCountry: "NP",
              },
            },
          }}
        />
      )}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Careers", path: "/careers" },
          { name: job.title, path: `/careers/${job.slug}` },
        ])}
      />
    </>
  );
}
