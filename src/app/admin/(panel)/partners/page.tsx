import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Flash, PageHeader, Table, Td, Th } from "@/components/admin/ui";

export const metadata = { title: "Technology partners" };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function PartnersAdmin({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db.select().from(schema.partners).orderBy(asc(schema.partners.sortOrder), asc(schema.partners.id));
  return (
    <>
      <PageHeader title="Technology partners" description="Brands you supply and support, shown on the homepage and About page." action={{ href: "/admin/partners/new", label: "Add partner" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <Table>
        <thead>
          <tr><Th>Order</Th><Th>Logo</Th><Th>Name</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-mist">
              <Td className="w-16 text-subtle">{r.sortOrder}</Td>
              <Td className="w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.logoUrl ? <img src={r.logoUrl} alt="" className="h-8 w-auto max-w-[80px] object-contain" /> : <span className="text-xs text-subtle">none</span>}
              </Td>
              <Td><Link href={`/admin/partners/${r.id}`} className="font-semibold hover:underline">{r.name}</Link></Td>
              <Td><Badge value={r.published ? "published" : "hidden"} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
