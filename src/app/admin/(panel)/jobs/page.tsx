import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Jobs" };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function JobsAdmin({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db
    .select({ j: schema.jobs, apps: count(schema.applications.id) })
    .from(schema.jobs)
    .leftJoin(schema.applications, eq(schema.applications.jobId, schema.jobs.id))
    .groupBy(schema.jobs.id)
    .orderBy(desc(schema.jobs.createdAt));
  return (
    <>
      <PageHeader title="Jobs" description="Open roles appear on /careers with an application form, and are marked up for Google for Jobs." action={{ href: "/admin/jobs/new", label: "Post a job" }} />
      <Flash saved={sp.saved} error={sp.error} />
      {rows.length === 0 ? (
        <Empty>No jobs yet. The careers page shows a general application form until you post one.</Empty>
      ) : (
        <Table>
          <thead>
            <tr><Th>Title</Th><Th>Department</Th><Th>Applications</Th><Th>Closes</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {rows.map(({ j, apps }) => (
              <tr key={j.id} className="hover:bg-mist">
                <Td><Link href={`/admin/jobs/${j.id}`} className="font-semibold hover:underline">{j.title}</Link></Td>
                <Td className="text-subtle">{j.department}</Td>
                <Td>{apps}</Td>
                <Td className="text-subtle">{formatDate(j.closesAt) || "—"}</Td>
                <Td><Badge value={j.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
