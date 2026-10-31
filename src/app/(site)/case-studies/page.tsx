import Link from "next/link";
import type { Metadata } from "next";
import { CtaBand, Dot, PageHero } from "@/components/site/sections";
import { PostGrid } from "@/components/site/posts";
import { getPosts } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Case Studies — IT Projects Delivered Across Nepal",
    description: "How Tech Bucket has delivered networks, security, software and managed IT for hospitals, development partners and enterprises in Nepal.",
    path: "/case-studies",
  });
}

export default async function CaseStudiesPage() {
  const posts = await getPosts("case_study");
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Home" }, { label: "Case studies" }]}
        eyebrow="Case studies"
        title={<>Work that speaks for itself<Dot /></>}
        lede="What we delivered, for whom, and what changed as a result."
      />
      <section className="bg-white">
        <div className="container-site py-20 sm:py-28">
          <PostGrid
            posts={posts}
            empty={
              <>
                Case studies are being prepared with our clients&apos; approval. Want references now?{" "}
                <Link href="/contact" className="link-underline text-ink">Contact us</Link>.
              </>
            }
          />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
