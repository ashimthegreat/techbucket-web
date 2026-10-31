import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Flash, PageHeader, Table, Td, Th } from "@/components/admin/ui";

export const metadata = { title: "Services" };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ServicesAdmin({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db.select().from(schema.services).orderBy(asc(schema.services.sortOrder), asc(schema.services.id));
  return (
    <>
      <PageHeader title="Services" description="Each service has its own page at /services/slug and appears in the menu, homepage and footer." action={{ href: "/admin/services/new", label: "Add service" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <Table>
        <thead>
          <tr><Th>Order</Th><Th>Title</Th><Th>URL</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-mist">
              <Td className="w-16 text-subtle">{r.sortOrder}</Td>
              <Td><Link href={`/admin/services/${r.id}`} className="font-semibold hover:underline">{r.title}</Link></Td>
              <Td className="text-subtle">/services/{r.slug}</Td>
              <Td><Badge value={r.published ? "published" : "hidden"} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
