import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Card, Flash, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Homepage" };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function HomepageAdmin({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const [featured, stats] = await Promise.all([
    db.select().from(schema.featuredItems).orderBy(asc(schema.featuredItems.sortOrder), asc(schema.featuredItems.id)),
    db.select().from(schema.stats).orderBy(asc(schema.stats.sortOrder), asc(schema.stats.id)),
  ]);
  return (
    <>
      <PageHeader title="Homepage" description="Featured cards under the hero and the key figures. Hero headline, about text and contact details live in Site settings." />
      <Flash saved={sp.saved} error={sp.error} />
      <div className="space-y-6">
        <Card title="Featured cards (best with 3)">
          <ul className="divide-y divide-hair">
            {featured.map((f) => (
              <li key={f.id}>
                <Link href={`/admin/homepage/featured/${f.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-mist">
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold tracking-[0.1em] text-accent-ink uppercase">{f.kicker} · {f.theme}</span>
                    <span className="block truncate font-semibold">{f.title}</span>
                  </span>
                  <Badge value={f.published ? "published" : "hidden"} />
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/admin/homepage/featured/new" className="mt-4 inline-flex min-h-10 items-center border border-ink px-4 text-sm font-semibold">Add featured card</Link>
        </Card>
        <Card title="Key figures">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/homepage/stats/${s.id}`} className="block border border-hair p-4 hover:border-ink">
                  <span className="font-display text-3xl font-semibold">{s.value}<span className="text-accent">{s.suffix}</span></span>
                  <span className="mt-1 block text-sm text-muted">{s.label}</span>
                  {!s.published && <span className="mt-2 block"><Badge value="hidden" /></span>}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/admin/homepage/stats/new" className="mt-4 inline-flex min-h-10 items-center border border-ink px-4 text-sm font-semibold">Add figure</Link>
        </Card>
        {user.role === "admin" && (
          <Card title="Hero & about text">
            <p className="text-[15px] text-muted">Edit the hero headline, subtitle and the &ldquo;Who we are&rdquo; statement in <Link href="/admin/settings" className="font-semibold text-accent-ink hover:underline">Site settings</Link>.</p>
          </Card>
        )}
      </div>
    </>
  );
}
