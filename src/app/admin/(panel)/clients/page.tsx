import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Flash, PageHeader, Table, Td, Th } from "@/components/admin/ui";

export const metadata = { title: "Clients" };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ClientsAdmin({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db.select().from(schema.clients).orderBy(asc(schema.clients.sortOrder), asc(schema.clients.id));
  const home = rows.filter((r) => r.showOnHome && r.published).length;
  return (
    <>
      <PageHeader
        title="Clients"
        description={`All clients appear on the About page. ${home} are shown in the homepage logo row (aim for about 8). Only list clients who have agreed to be named.`}
        action={{ href: "/admin/clients/new", label: "Add client" }}
      />
      <Flash saved={sp.saved} error={sp.error} />
      <Table>
        <thead>
          <tr><Th>Order</Th><Th>Logo</Th><Th>Name</Th><Th>Sector</Th><Th>Homepage</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-mist">
              <Td className="w-16 text-subtle">{r.sortOrder}</Td>
              <Td className="w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.logoUrl ? <img src={r.logoUrl} alt="" className="h-8 w-auto max-w-[80px] object-contain" /> : <span className="text-xs text-subtle">none</span>}
              </Td>
              <Td><Link href={`/admin/clients/${r.id}`} className="font-semibold hover:underline">{r.name}</Link></Td>
              <Td className="text-subtle">{r.sector}</Td>
              <Td>{r.showOnHome ? "Yes" : <span className="text-subtle">—</span>}</Td>
              <Td><Badge value={r.published ? "published" : "hidden"} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
