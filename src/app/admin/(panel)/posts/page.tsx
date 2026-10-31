import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Insights & case studies" };
type Props = { searchParams: Promise<{ type?: string; saved?: string; error?: string }> };

export default async function PostsAdmin({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const type = sp.type === "case_study" || sp.type === "insight" ? sp.type : undefined;
  const rows = await db
    .select()
    .from(schema.posts)
    .where(type ? eq(schema.posts.type, type) : undefined)
    .orderBy(desc(schema.posts.updatedAt));
  const tab = (t: string | undefined, label: string) => (
    <Link
      href={t ? `/admin/posts?type=${t}` : "/admin/posts"}
      className={`min-h-9 border px-3 py-1.5 text-sm font-semibold ${type === t ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
    >
      {label}
    </Link>
  );
  return (
    <>
      <PageHeader
        title="Insights & case studies"
        description="Articles publish at /insights/slug; case studies at /case-studies/slug. Regular, useful articles are the biggest SEO lever."
        action={{ href: `/admin/posts/new${type ? `?type=${type}` : ""}`, label: "Write new" }}
      />
      <Flash saved={sp.saved} error={sp.error} />
      <div className="mb-5 flex flex-wrap gap-2">
        {tab(undefined, "All")}
        {tab("insight", "Insights")}
        {tab("case_study", "Case studies")}
      </div>
      {rows.length === 0 ? (
        <Empty>Nothing here yet.</Empty>
      ) : (
        <Table>
          <thead>
            <tr><Th>Title</Th><Th>Type</Th><Th>Category</Th><Th>Published</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-mist">
                <Td><Link href={`/admin/posts/${p.id}`} className="font-semibold hover:underline">{p.title}</Link></Td>
                <Td className="text-subtle">{p.type === "case_study" ? "Case study" : "Insight"}</Td>
                <Td className="text-subtle">{p.category}</Td>
                <Td className="whitespace-nowrap text-subtle">{formatDate(p.publishedAt) || "—"}</Td>
                <Td><Badge value={p.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
