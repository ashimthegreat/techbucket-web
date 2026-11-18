import Link from "next/link";
import { desc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { HealthFinding, HealthRun } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Card, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { cn, formatDateTime } from "@/lib/utils";
import { runHealthNow } from "../../actions";

export const metadata = { title: "Site health" };

type Cat = HealthFinding["category"];
type Sev = HealthFinding["severity"];
type Props = { searchParams: Promise<{ cat?: string; sev?: string; run?: string; ran?: string; busy?: string }> };

const CATS: { key: Cat; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "seo", label: "SEO" },
  { key: "security", label: "Security" },
  { key: "operations", label: "Operations" },
];
const SEVS: { key: Sev; label: string; bar: string; chip: string }[] = [
  { key: "critical", label: "Critical", bar: "bg-red-600", chip: "bg-red-50 text-red-800" },
  { key: "warning", label: "Fix soon", bar: "bg-amber-500", chip: "bg-amber-50 text-amber-800" },
  { key: "info", label: "Suggestion", bar: "bg-slate-300", chip: "bg-mist text-slate" },
];

function tone(score: number) {
  return score >= 85 ? "text-emerald-700" : score >= 60 ? "text-amber-700" : "text-red-700";
}

function qs(base: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return `/admin/health${s ? `?${s}` : ""}`;
}

function Trend({ runs, field }: { runs: HealthRun[]; field: Cat | "overall" }) {
  const pts = runs
    .filter((r) => r.scores)
    .slice(0, 12)
    .reverse()
    .map((r) => r.scores![field]);
  if (pts.length < 2) return null;
  const w = 96;
  const h = 24;
  const step = w / (pts.length - 1);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (v / 100) * h).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 -2 ${w} ${h + 4}`} aria-hidden="true" className="mt-3 text-fog">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default async function HealthPage({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const history = await db
    .select()
    .from(schema.healthRuns)
    .where(isNotNull(schema.healthRuns.finishedAt))
    .orderBy(desc(schema.healthRuns.startedAt))
    .limit(26);
  const runId = Number(sp.run);
  const run =
    (Number.isInteger(runId) && runId > 0
      ? (await db.select().from(schema.healthRuns).where(eq(schema.healthRuns.id, runId)))[0]
      : history[0]) ?? null;
  const cat = CATS.find((c) => c.key === sp.cat)?.key;
  const sev = SEVS.find((s) => s.key === sp.sev)?.key;
  const base = { run: sp.run, cat, sev };

  const runForm = (
    <form action={runHealthNow}>
      <SubmitButton pendingLabel="Checking the whole site… (1–3 minutes)">Run check now</SubmitButton>
    </form>
  );

  if (!run || !run.scores) {
    return (
      <>
        <PageHeader title="Site health" description="Checks content, SEO, security and the server automatically every week." />
        <Card>
          <p className="mb-5 max-w-2xl text-[15px] text-muted">
            No check has run yet. The first automatic check runs within a few minutes of a deploy, then every week. You can also run one now; it takes 1–3 minutes.
          </p>
          {runForm}
        </Card>
      </>
    );
  }

  const findings = run.findings.filter((f) => (!cat || f.category === cat) && (!sev || f.severity === sev));
  const count = (c: Cat | undefined, s: Sev) => run.findings.filter((f) => (!c || f.category === c) && f.severity === s).length;
  const isLatest = run.id === history[0]?.id;

  return (
    <>
      <PageHeader
        title="Site health"
        description={`Checks content, SEO, security and the server automatically every week. ${isLatest ? "Last check" : "Showing the check from"} ${formatDateTime(run.startedAt)} (${run.trigger === "manual" ? "run by hand" : "scheduled"}), ${run.pagesChecked} pages in ${Math.round((run.durationMs ?? 0) / 1000)} s.`}
      />
      {sp.ran && <p role="status" className="mb-6 border-l-[3px] border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Check finished. Results below.</p>}
      {sp.busy && <p role="status" className="mb-6 border-l-[3px] border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">A check is already running. Refresh this page in a minute or two.</p>}
      {!isLatest && (
        <p className="mb-6 border-l-[3px] border-sky-600 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          You are looking at an older check. <Link href="/admin/health" className="font-semibold underline">Show the latest</Link>
        </p>
      )}
      {run.error && (
        <p role="alert" className="mb-6 border-l-[3px] border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800">
          Part of the check could not run: {run.error}
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">{runForm}</div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Link href={qs(base, { cat: undefined })} className={cn("border bg-white p-5 hover:border-ink", !cat ? "border-ink" : "border-hair")}>
          <div className={cn("font-display text-5xl font-semibold tracking-[-0.03em]", tone(run.scores.overall))}>{run.scores.overall}</div>
          <div className="mt-2 text-sm font-semibold">Overall</div>
          <div className="text-xs text-subtle">
            {count(undefined, "critical")} critical · {count(undefined, "warning")} to fix
          </div>
          <Trend runs={history} field="overall" />
        </Link>
        {CATS.map((c) => (
          <Link
            key={c.key}
            href={qs(base, { cat: cat === c.key ? undefined : c.key })}
            className={cn("border bg-white p-5 hover:border-ink", cat === c.key ? "border-ink" : "border-hair")}
          >
            <div className={cn("font-display text-4xl font-semibold tracking-[-0.03em]", tone(run.scores![c.key]))}>{run.scores![c.key]}</div>
            <div className="mt-2 text-sm font-semibold">{c.label}</div>
            <div className="text-xs text-subtle">
              {count(c.key, "critical")} critical · {count(c.key, "warning")} to fix
            </div>
            <Trend runs={history} field={c.key} />
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={qs(base, { sev: undefined })} className={cn("border px-3 py-1.5 font-semibold", !sev ? "border-ink bg-ink text-white" : "border-hair bg-white")}>
          All ({run.findings.filter((f) => !cat || f.category === cat).length})
        </Link>
        {SEVS.map((s) => (
          <Link
            key={s.key}
            href={qs(base, { sev: sev === s.key ? undefined : s.key })}
            className={cn("border px-3 py-1.5 font-semibold", sev === s.key ? "border-ink bg-ink text-white" : "border-hair bg-white")}
          >
            {s.label} ({count(cat, s.key)})
          </Link>
        ))}
      </div>

      {findings.length === 0 ? (
        <Card>
          <p className="text-[15px] text-muted">Nothing to fix here.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {findings.map((f) => {
            const s = SEVS.find((x) => x.key === f.severity)!;
            return (
              <li key={f.id} className="relative border border-hair bg-white py-4 pr-5 pl-6">
                <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", s.bar)} />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className={cn("px-2 py-0.5", s.chip)}>{s.label}</span>
                      <span className="text-subtle uppercase tracking-[0.08em]">{CATS.find((c) => c.key === f.category)?.label}</span>
                    </div>
                    <p className="font-semibold">{f.title}</p>
                    {f.detail && <p className="mt-1.5 text-sm break-words whitespace-pre-line text-muted">{f.detail}</p>}
                    {f.fix && (
                      <p className="mt-2 text-sm">
                        <span className="font-semibold">How to fix: </span>
                        {f.fix}
                      </p>
                    )}
                  </div>
                  {f.href && (
                    <Link href={f.href} className="shrink-0 self-start border border-ink px-3 py-1.5 text-sm font-semibold hover:bg-ink hover:text-white">
                      Open →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-6 border border-hair bg-white p-5">
        <summary className="cursor-pointer font-semibold">
          {run.passed.filter((p) => !cat || p.category === cat).length} checks passed
        </summary>
        <ul className="mt-4 grid gap-x-8 gap-y-1.5 text-sm text-muted md:grid-cols-2">
          {run.passed
            .filter((p) => !cat || p.category === cat)
            .map((p, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true" className="text-emerald-700">✓</span>
                <span>
                  <span className="text-subtle">{CATS.find((c) => c.key === p.category)?.label}:</span> {p.title}
                </span>
              </li>
            ))}
        </ul>
      </details>

      <h2 className="mt-10 mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-subtle">History</h2>
      <Table>
        <thead>
          <tr>
            <Th>Checked</Th>
            <Th>Overall</Th>
            {CATS.map((c) => (
              <Th key={c.key}>{c.label}</Th>
            ))}
            <Th>Critical</Th>
            <Th>To fix</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {history.map((r) => (
            <tr key={r.id} className={r.id === run.id ? "bg-mist" : undefined}>
              <Td>
                {formatDateTime(r.startedAt)}
                <span className="block text-xs text-subtle">{r.trigger === "manual" ? "by hand" : "scheduled"}</span>
              </Td>
              <Td className={cn("font-semibold", r.scores && tone(r.scores.overall))}>{r.scores?.overall ?? "–"}</Td>
              {CATS.map((c) => (
                <Td key={c.key}>{r.scores?.[c.key] ?? "–"}</Td>
              ))}
              <Td>{r.findings.filter((f) => f.severity === "critical").length}</Td>
              <Td>{r.findings.filter((f) => f.severity === "warning").length}</Td>
              <Td>
                {r.id !== run.id && (
                  <Link href={`/admin/health?run=${r.id}`} className="font-semibold underline-offset-4 hover:underline">
                    View
                  </Link>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
