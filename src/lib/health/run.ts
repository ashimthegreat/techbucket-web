import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { HealthRun } from "@/db/schema";
import { notify } from "@/lib/mail";
import { siteUrl } from "@/lib/utils";
import { Collector } from "./collector";
import { contentChecks } from "./content";
import { liveChecks } from "./live";
import { systemChecks } from "./system";

/** Token the weekly cron job sends. Derived from SESSION_SECRET so no extra setting is needed. */
export function healthToken() {
  return createHash("sha256").update(`health:${process.env.SESSION_SECRET ?? ""}`).digest("hex");
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

export async function latestRun(): Promise<HealthRun | null> {
  const [row] = await db.select().from(schema.healthRuns).orderBy(desc(schema.healthRuns.startedAt)).limit(1);
  return row ?? null;
}

/**
 * Runs every check and stores the result. Returns null if another run started
 * in the last 10 minutes and hasn't finished (so a double-click or overlapping
 * cron call doesn't hammer the server).
 */
export async function runHealthCheck(trigger: "schedule" | "manual"): Promise<HealthRun | null> {
  const [busy] = await db
    .select({ id: schema.healthRuns.id })
    .from(schema.healthRuns)
    .where(and(isNull(schema.healthRuns.finishedAt), gte(schema.healthRuns.startedAt, sql`now() - interval '10 minutes'`)));
  if (busy) return null;

  const started = Date.now();
  const [run] = await db.insert(schema.healthRuns).values({ trigger }).returning();
  const c = new Collector();
  let pages = 0;
  let error: string | null = null;

  const steps: [string, () => Promise<unknown>][] = [
    ["content", () => contentChecks(c)],
    ["live site", async () => (pages = await liveChecks(c))],
    ["server", () => systemChecks(c)],
  ];
  for (const [name, step] of steps) {
    try {
      await step();
    } catch (e) {
      const msg = `${name} checks failed: ${(e as Error).message}`;
      error = error ? `${error}; ${msg}` : msg;
      console.error("[health]", msg);
    }
  }

  const findings = c.findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const [saved] = await db
    .update(schema.healthRuns)
    .set({
      finishedAt: new Date(),
      durationMs: Date.now() - started,
      pagesChecked: pages,
      scores: c.scores(),
      findings,
      passed: c.passed,
      error,
    })
    .where(eq(schema.healthRuns.id, run.id))
    .returning();

  // Keep a year of weekly history.
  await db
    .delete(schema.healthRuns)
    .where(lt(schema.healthRuns.startedAt, sql`now() - interval '400 days'`))
    .catch(() => {});

  if (trigger === "schedule") await emailSummary(saved).catch((e) => console.error("[health] email failed:", e));
  return saved;
}

async function emailSummary(run: HealthRun) {
  const [s] = await db.select({ to: schema.siteSettings.leadNotifyEmail }).from(schema.siteSettings).where(eq(schema.siteSettings.id, 1));
  if (!s?.to || !run.scores) return;
  const crit = run.findings.filter((f) => f.severity === "critical");
  const warn = run.findings.filter((f) => f.severity === "warning");
  const lines = [
    `Overall ${run.scores.overall}/100 · Content ${run.scores.content} · SEO ${run.scores.seo} · Security ${run.scores.security} · Operations ${run.scores.operations}`,
    `${crit.length} critical, ${warn.length} to fix, ${run.passed.length} checks passed, ${run.pagesChecked} pages checked.`,
    "",
    ...(crit.length ? ["CRITICAL", ...crit.map((f) => `- ${f.title}`), ""] : []),
    ...(warn.length ? ["TO FIX", ...warn.slice(0, 15).map((f) => `- ${f.title}`), warn.length > 15 ? `- …and ${warn.length - 15} more` : "", ""] : []),
    `Full report: ${siteUrl("/admin/health")}`,
  ];
  await notify(
    s.to,
    `Site health ${run.scores.overall}/100${crit.length ? ` · ${crit.length} critical` : ""} · techbucket.com.np`,
    lines.join("\n"),
  );
}
