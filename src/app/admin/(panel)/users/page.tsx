import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Flash, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Users" };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function UsersAdmin({ searchParams }: Props) {
  await requireUser("admin");
  const sp = await searchParams;
  const rows = await db.select().from(schema.users).orderBy(asc(schema.users.name));
  return (
    <>
      <PageHeader
        title="Users"
        description="Admins manage everything. Editors manage content, enquiries and applications, but not settings, users or deletions of core pages."
        action={{ href: "/admin/users/new", label: "Add user" }}
      />
      <Flash saved={sp.saved} error={sp.error} />
      <Table>
        <thead>
          <tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Last sign-in</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="hover:bg-mist">
              <Td><Link href={`/admin/users/${u.id}`} className="font-semibold hover:underline">{u.name}</Link></Td>
              <Td className="text-subtle">{u.email}</Td>
              <Td className="capitalize">{u.role}</Td>
              <Td className="text-subtle">{formatDateTime(u.lastLoginAt) || "Never"}</Td>
              <Td><Badge value={u.active ? "published" : "hidden"} label={u.active ? "Active" : "Disabled"} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
