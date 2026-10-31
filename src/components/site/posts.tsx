import Link from "next/link";
import type { PublicPost } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate, siteUrl } from "@/lib/utils";
import { CtaBand, Dot, JsonLd, PageHero, TypeTile } from "./sections";
import { breadcrumbJsonLd } from "@/lib/seo";

const tones = ["accent", "light", "dark"] as const;

export function postHref(p: Pick<PublicPost, "type" | "slug">) {
  return `/${p.type === "case_study" ? "case-studies" : "insights"}/${p.slug}`;
}

export function PostGrid({ posts, empty }: { posts: PublicPost[]; empty: React.ReactNode }) {
  if (posts.length === 0) {
    return <div className="border-t border-ink py-16 text-lg text-muted">{empty}</div>;
  }
  const [lead, ...rest] = posts;
  return (
    <div className="space-y-14">
      <Link href={postHref(lead)} className="group grid gap-8 bg-mist lg:grid-cols-2">
        {lead.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lead.coverUrl} alt="" className="aspect-[16/10] h-full w-full object-cover" />
        ) : (
          <TypeTile headline={lead.coverHeadline || lead.category || lead.title} tone="accent" className="h-full" />
        )}
        <div className="flex flex-col gap-5 p-7 sm:p-10 lg:justify-center">
          <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-ink">
            {lead.type === "case_study" ? lead.clientName || "Case study" : lead.category || "Insight"}
          </span>
          <h2 className="font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.1] font-medium tracking-[-0.02em] group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
            {lead.title}
          </h2>
          {lead.excerpt && <p className="text-lg leading-relaxed text-muted">{lead.excerpt}</p>}
          <span className="text-sm text-subtle">
            {formatDate(lead.publishedAt)} · {lead.readMinutes} min read
          </span>
        </div>
      </Link>
      {rest.length > 0 && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p, i) => (
            <Link key={p.id} href={postHref(p)} className="group flex flex-col bg-white">
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
              ) : (
                <TypeTile headline={p.coverHeadline || p.category || p.title} tone={tones[(i + 1) % 3]} />
              )}
              <div className="flex flex-1 flex-col gap-3.5 border-x border-b border-hair p-7">
                <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-ink">
                  {p.type === "case_study" ? p.clientName || "Case study" : p.category || "Insight"}
                </span>
                <span className="font-display text-2xl leading-tight font-medium group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
                  {p.title}
                </span>
                <span className="mt-auto pt-2 text-sm text-subtle">
                  {formatDate(p.publishedAt)} · {p.readMinutes} min read
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PostArticle({ post, section }: { post: PublicPost; section: { href: string; label: string } }) {
  const url = siteUrl(postHref(post));
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, section, { label: post.title }]}
        eyebrow={post.type === "case_study" ? `Case study${post.clientName ? ` · ${post.clientName}` : ""}` : post.category || "Insight"}
        title={<>{post.title.replace(/[.?!]$/, "")}{/[?!]$/.test(post.title) ? post.title.slice(-1) : <Dot />}</>}
        lede={post.excerpt || undefined}
      >
        <p className="mt-8 text-sm text-fog">
          {formatDate(post.publishedAt)} · {post.readMinutes} min read
        </p>
      </PageHero>
      {post.coverUrl && (
        <div className="container-site -mt-10 sm:-mt-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverUrl} alt="" className="aspect-[21/9] w-full object-cover" />
        </div>
      )}
      <section className="bg-white">
        <div className="container-site py-16 sm:py-24">
          <article className="prose-tb mx-auto lg:mx-0 lg:ml-[8%]" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
          <div className="mx-auto mt-16 max-w-[720px] border-t border-ink pt-8 lg:mx-0 lg:ml-[8%]">
            <Link href={section.href} className="link-underline text-base">
              ← All {section.label.toLowerCase()}
            </Link>
          </div>
        </div>
      </section>
      <CtaBand />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": post.type === "case_study" ? "Article" : "BlogPosting",
          headline: post.title,
          description: post.seoDescription || post.excerpt,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          mainEntityOfPage: url,
          url,
          image: post.coverUrl ? siteUrl(post.coverUrl) : siteUrl("/opengraph-image"),
          author: { "@id": siteUrl("/#organization") },
          publisher: { "@id": siteUrl("/#organization") },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: section.label, path: section.href },
          { name: post.title, path: postHref(post) },
        ])}
      />
    </>
  );
}
