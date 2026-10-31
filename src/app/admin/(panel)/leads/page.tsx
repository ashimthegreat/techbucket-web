import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Enquiries" };
const statuses = ["new", "contacted", "qualified", "won", "lost", "spam"] as const;

type Props = { searchParams: Promise<{ status?: string; q?: string; saved?: string; error?: string }> };

export default async function LeadsPage({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const status = statuses.find((s) => s === sp.status);
  const q = (sp.q ?? "").trim().slice(0, 100);
  const where: SQL[] = [];
  if (status) where.push(eq(schema.leads.status, status));
  if (q) {
    const like = `%${q}%`;
    where.push(
      or(
        ilike(schema.leads.name, like),
        ilike(schema.leads.email, like),
        ilike(schema.leads.organisation, like),
        ilike(schema.leads.message, like),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.leads)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.leads.createdAt))
    .limit(300);

  const filterHref = (s?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return `/admin/leads${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Enquiries" description="Contact-form submissions from the website." action={{ href: `/admin/leads/export${status ? `?status=${status}` : ""}`, label: "Export CSV" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link href={filterHref()} className={`min-h-9 border px-3 py-1.5 text-sm font-semibold ${!status ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>All</Link>
          {statuses.map((s) => (
            <Link key={s} href={filterHref(s)} className={`min-h-9 border px-3 py-1.5 text-sm font-semibold capitalize ${status === s ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
              {s}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="q" className="sr-only">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search name, email, message…" className="min-h-10 w-full border border-line bg-white px-3 text-sm lg:w-72" />
          <button className="min-h-10 bg-ink px-4 text-sm font-semibold text-white">Search</button>
        </form>
      </div>
      {rows.length === 0 ? (
        <Empty>No enquiries match.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Received</Th>
              <Th>Name</Th>
              <Th>Interest</Th>
              <Th>Source</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-mist">
                <Td className="whitespace-nowrap text-subtle">{formatDateTime(l.createdAt)}</Td>
                <Td>
                  <Link href={`/admin/leads/${l.id}`} className="font-semibold hover:underline">{l.name}</Link>
                  <div className="text-xs text-muted">{[l.organisation, l.email].filter(Boolean).join(" · ")}</div>
                </Td>
                <Td>{l.service || <span className="text-subtle">—</span>}</Td>
                <Td className="text-subtle">{l.source}</Td>
                <Td><Badge value={l.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
