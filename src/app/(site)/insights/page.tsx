import Link from "next/link";
import type { Metadata } from "next";
import { CtaBand, Dot, PageHero } from "@/components/site/sections";
import { PostGrid } from "@/components/site/posts";
import { getPosts } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Insights — IT, Cybersecurity & Infrastructure in Nepal",
    description: "Practical thinking on cybersecurity, networks, cloud and IT investment for organisations in Nepal, from the Tech Bucket team.",
    path: "/insights",
  });
}

export default async function InsightsPage() {
  const posts = await getPosts("insight");
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, { label: "Insights" }]}
        eyebrow="Insights"
        title={<>Thinking from the field<Dot /></>}
        lede="Practical guidance on security, networks, cloud and IT investment — written by the engineers who do the work."
      />
      <section className="bg-white">
        <div className="container-site py-20 sm:py-28">
          <PostGrid
            posts={posts}
            empty={
              <>
                New articles are on the way. In the meantime, <Link href="/contact" className="link-underline text-ink">ask us a question</Link>.
              </>
            }
          />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
