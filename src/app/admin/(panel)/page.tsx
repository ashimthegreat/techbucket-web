import Link from "next/link";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Card, Flash } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

type Props = { searchParams: Promise<{ denied?: string }> };

export default async function Dashboard({ searchParams }: Props) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const [[leads30], [newLeads], [apps], [published], [openJobs], recentLeads, recentApps] = await Promise.all([
    db.select({ n: count() }).from(schema.leads).where(gte(schema.leads.createdAt, sql`now() - interval '30 days'`)),
    db.select({ n: count() }).from(schema.leads).where(eq(schema.leads.status, "new")),
    db.select({ n: count() }).from(schema.applications).where(eq(schema.applications.status, "new")),
    db.select({ n: count() }).from(schema.posts).where(eq(schema.posts.status, "published")),
    db.select({ n: count() }).from(schema.jobs).where(eq(schema.jobs.status, "open")),
    db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt)).limit(6),
    db
      .select({ a: schema.applications, jobTitle: schema.jobs.title })
      .from(schema.applications)
      .leftJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
      .orderBy(desc(schema.applications.createdAt))
      .limit(5),
  ]);

  const tiles = [
    { label: "New enquiries", value: newLeads.n, href: "/admin/leads?status=new", accent: newLeads.n > 0 },
    { label: "Enquiries, last 30 days", value: leads30.n, href: "/admin/leads" },
    { label: "New applications", value: apps.n, href: "/admin/applications", accent: apps.n > 0 },
    { label: "Published articles", value: published.n, href: "/admin/posts" },
    { label: "Open jobs", value: openJobs.n, href: "/admin/jobs" },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">Namaste, {user.name.split(" ")[0]}</h1>
        <p className="mt-2 text-[15px] text-muted">Here&apos;s what&apos;s happening on techbucket.com.np.</p>
      </div>
      {denied && <Flash error="That section is for administrators only." />}

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="border border-hair bg-white p-5 hover:border-ink">
            <div className={`font-display text-4xl font-semibold tracking-[-0.03em] ${t.accent ? "text-accent-ink" : ""}`}>{t.value}</div>
            <div className="mt-2 text-sm text-muted">{t.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Latest enquiries">
          {recentLeads.length === 0 ? (
            <p className="text-[15px] text-muted">No enquiries yet. They appear here when someone submits the contact form.</p>
          ) : (
            <ul className="divide-y divide-hair">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <Link href={`/admin/leads/${l.id}`} className="flex items-start justify-between gap-4 py-3 hover:bg-mist">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {l.name}
                        {l.organisation && <span className="font-normal text-muted"> · {l.organisation}</span>}
                      </span>
                      <span className="block truncate text-sm text-muted">{l.service || l.message}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge value={l.status} />
                      <span className="text-xs text-subtle">{formatDateTime(l.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Latest applications">
            {recentApps.length === 0 ? (
              <p className="text-[15px] text-muted">No applications yet.</p>
            ) : (
              <ul className="divide-y divide-hair">
                {recentApps.map(({ a, jobTitle }) => (
                  <li key={a.id}>
                    <Link href={`/admin/applications/${a.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-mist">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{a.name}</span>
                        <span className="block truncate text-sm text-muted">{jobTitle ?? "General application"}</span>
                      </span>
                      <Badge value={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Quick actions">
            <div className="grid gap-2 text-[15px] font-semibold">
              <Link href="/admin/posts/new" className="border border-hair px-4 py-3 hover:border-ink">Write an insight or case study</Link>
              <Link href="/admin/jobs/new" className="border border-hair px-4 py-3 hover:border-ink">Post a job</Link>
              <Link href="/admin/homepage" className="border border-hair px-4 py-3 hover:border-ink">Edit homepage highlights</Link>
              <Link href="/admin/leads/export" className="border border-hair px-4 py-3 hover:border-ink">Export enquiries (CSV)</Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
