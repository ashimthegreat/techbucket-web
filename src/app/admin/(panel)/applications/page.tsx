import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Applications" };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ApplicationsPage({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db
    .select({ a: schema.applications, jobTitle: schema.jobs.title })
    .from(schema.applications)
    .leftJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
    .orderBy(desc(schema.applications.createdAt))
    .limit(500);
  return (
    <>
      <PageHeader title="Applications" description="CVs submitted through the careers pages." />
      <Flash saved={sp.saved} error={sp.error} />
      {rows.length === 0 ? (
        <Empty>No applications yet.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Received</Th>
              <Th>Applicant</Th>
              <Th>Role</Th>
              <Th>CV</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, jobTitle }) => (
              <tr key={a.id} className="hover:bg-mist">
                <Td className="whitespace-nowrap text-subtle">{formatDateTime(a.createdAt)}</Td>
                <Td>
                  <Link href={`/admin/applications/${a.id}`} className="font-semibold hover:underline">{a.name}</Link>
                  <div className="text-xs text-muted">{a.email}</div>
                </Td>
                <Td>{jobTitle ?? "General application"}</Td>
                <Td>{a.cvPath ? <a href={`/admin/applications/${a.id}/cv`} className="text-accent-ink hover:underline">Download</a> : "—"}</Td>
                <Td><Badge value={a.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
