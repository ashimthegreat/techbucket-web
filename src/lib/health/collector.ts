import "server-only";
import type { HealthFinding, HealthScores } from "@/db/schema";

type Category = HealthFinding["category"];
type Severity = HealthFinding["severity"];

const WEIGHT: Record<Severity, number> = { critical: 5, warning: 3, info: 1 };

/** Collects pass/fail results from every check and turns them into scores. */
export class Collector {
  findings: HealthFinding[] = [];
  passed: { category: Category; title: string }[] = [];
  private totals: Record<Category, { all: number; ok: number }> = {
    content: { all: 0, ok: 0 },
    seo: { all: 0, ok: 0 },
    security: { all: 0, ok: 0 },
    operations: { all: 0, ok: 0 },
  };

  /**
   * Record one check. `ok` passes it; otherwise it becomes a finding.
   * `passTitle` is what the dashboard lists under "Passed".
   */
  check(
    ok: boolean,
    f: { id: string; category: Category; severity: Severity; title: string; passTitle: string; detail?: string; fix?: string; href?: string },
  ) {
    const w = WEIGHT[f.severity];
    this.totals[f.category].all += w;
    if (ok) {
      this.totals[f.category].ok += w;
      this.passed.push({ category: f.category, title: f.passTitle });
    } else {
      const { passTitle: _ignored, ...finding } = f;
      void _ignored;
      this.findings.push(finding);
    }
  }

  /** A check that could not run (e.g. network). Recorded as info, not scored. */
  skipped(category: Category, id: string, title: string, detail: string) {
    this.findings.push({ id, category, severity: "info", title, detail });
  }

  scores(): HealthScores {
    const pct = (c: Category) => {
      const t = this.totals[c];
      return t.all === 0 ? 100 : Math.round((t.ok / t.all) * 100);
    };
    const all = Object.values(this.totals).reduce((a, t) => ({ all: a.all + t.all, ok: a.ok + t.ok }), { all: 0, ok: 0 });
    return {
      overall: all.all === 0 ? 100 : Math.round((all.ok / all.all) * 100),
      content: pct("content"),
      seo: pct("seo"),
      security: pct("security"),
      operations: pct("operations"),
    };
  }
}

export const DAY = 24 * 60 * 60 * 1000;

export function daysSince(d: Date | string | null | undefined) {
  if (!d) return Infinity;
  return Math.floor((Date.now() - new Date(d).getTime()) / DAY);
}

export function words(md: string | null | undefined) {
  return (md ?? "")
    .replace(/[#>*_`[\]()!-]/g, " ")
    .split(/\s+/)
    .filter((w) => /\w/.test(w)).length;
}

/** "a, b, c and 4 more" — keeps finding details short. */
export function listOf(items: string[], max = 6) {
  if (items.length <= max) return items.join("\n");
  return [...items.slice(0, max), `…and ${items.length - max} more`].join("\n");
}
