import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PostArticle } from "@/components/site/posts";
import { getPost } from "@/lib/data";
import { plainText } from "@/lib/markdown";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost("case_study", slug);
  if (!p) return {};
  return pageMetadata({
    title: p.seoTitle || p.title,
    description: p.seoDescription || p.excerpt || plainText(p.body),
    path: `/case-studies/${p.slug}`,
    type: "article",
    publishedTime: p.publishedAt,
    image: p.coverUrl,
  });
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost("case_study", slug);
  if (!post) notFound();
  return <PostArticle post={post} section={{ href: "/case-studies", label: "Case studies" }} />;
}
