import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Flash, PageHeader, Table, Td, Th } from "@/components/admin/ui";

export const metadata = { title: "Industries" };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function IndustriesAdmin({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db.select().from(schema.industries).orderBy(asc(schema.industries.sortOrder), asc(schema.industries.id));
  return (
    <>
      <PageHeader title="Industries" description="Sector pages at /industries/slug, shown on the homepage and in the menu." action={{ href: "/admin/industries/new", label: "Add industry" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <Table>
        <thead>
          <tr><Th>Order</Th><Th>Title</Th><Th>URL</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-mist">
              <Td className="w-16 text-subtle">{r.sortOrder}</Td>
              <Td><Link href={`/admin/industries/${r.id}`} className="font-semibold hover:underline">{r.title}</Link></Td>
              <Td className="text-subtle">/industries/{r.slug}</Td>
              <Td><Badge value={r.published ? "published" : "hidden"} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
