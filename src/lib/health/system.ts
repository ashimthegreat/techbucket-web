import "server-only";
import { existsSync, readFileSync, readdirSync, statSync, openSync, readSync, closeSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { uploadRoot } from "@/lib/uploads";
import { Collector, DAY, daysSince, listOf } from "./collector";

const RUNTIME_PACKAGES = ["next", "react", "react-dom", "pg", "bcryptjs", "nodemailer", "sanitize-html"];

function installedVersion(pkg: string): string | null {
  for (const dir of [path.join(process.cwd(), "node_modules", pkg), path.join(process.cwd(), "..", "node_modules", pkg)]) {
    try {
      return JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")).version;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Last `bytes` of a file, without reading the whole thing. */
function tail(file: string, bytes = 200_000): string {
  try {
    const size = statSync(file).size;
    const fd = openSync(file, "r");
    const len = Math.min(bytes, size);
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, size - len);
    closeSync(fd);
    return buf.toString("utf8");
  } catch {
    return "";
  }
}

function dirSize(dir: string): number {
  let total = 0;
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) total += dirSize(p);
      else if (e.isFile()) total += statSync(p).size;
    }
  } catch {
    /* missing */
  }
  return total;
}

const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;

export async function systemChecks(c: Collector) {
  const home = os.homedir();
  const production = process.env.NODE_ENV === "production";

  /* ---------- Known vulnerabilities in installed packages ---------- */
  const versions = Object.fromEntries(
    RUNTIME_PACKAGES.map((p) => [p, installedVersion(p)]).filter(([, v]) => v) as [string, string][],
  );
  try {
    const res = await fetch("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(Object.entries(versions).map(([k, v]) => [k, [v]]))),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, { title: string; severity: string; url: string; vulnerable_versions: string }[]>;
    const all = Object.entries(data).flatMap(([pkg, list]) => list.map((a) => ({ pkg, ...a })));
    const serious = all.filter((a) => a.severity === "critical" || a.severity === "high");
    const moderate = all.filter((a) => a.severity === "moderate" || a.severity === "low");
    const fmt = (a: (typeof all)[number]) => `${a.pkg} ${versions[a.pkg]}: ${a.title} (${a.severity}) ${a.url}`;
    c.check(serious.length === 0, {
      id: "deps-serious",
      category: "security",
      severity: "critical",
      title: `${serious.length} serious security issue${serious.length === 1 ? "" : "s"} in the site's software packages`,
      passTitle: `No high or critical vulnerabilities in ${Object.keys(versions).length} runtime packages`,
      detail: listOf(serious.map(fmt), 8),
      fix: "Update the affected packages in the code (package.json), push, and let the deploy install them.",
    });
    c.check(moderate.length === 0, {
      id: "deps-moderate",
      category: "security",
      severity: "warning",
      title: `${moderate.length} moderate or low security issue${moderate.length === 1 ? "" : "s"} in packages`,
      passTitle: "No moderate or low vulnerabilities in runtime packages",
      detail: listOf(moderate.map(fmt), 8),
      fix: "Plan an update of the affected packages.",
    });
  } catch (e) {
    c.skipped("security", "deps", "Could not check packages for known vulnerabilities", (e as Error).message);
  }
  if (versions.next) {
    try {
      const res = await fetch("https://registry.npmjs.org/-/package/next/dist-tags", { signal: AbortSignal.timeout(15000) });
      const tags = (await res.json()) as { latest?: string };
      const [cur, lat] = [versions.next, tags.latest ?? versions.next].map((v) => v.split(".").map(Number));
      const behind = lat[0] > cur[0] || (lat[0] === cur[0] && (lat[1] > cur[1] || (lat[1] === cur[1] && lat[2] > cur[2])));
      c.check(!behind, {
        id: "next-latest",
        category: "security",
        severity: lat[0] === cur[0] && lat[1] === cur[1] ? "warning" : "info",
        title: `Next.js ${versions.next} is installed; ${tags.latest} is available`,
        passTitle: `Next.js ${versions.next} is the latest release`,
        fix: "Patch releases often contain security fixes. Update in package.json and redeploy.",
      });
    } catch (e) {
      c.skipped("security", "next-latest", "Could not check for a newer Next.js", (e as Error).message);
    }
  }
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  c.check(nodeMajor >= 22, {
    id: "node-version",
    category: "security",
    severity: "warning",
    title: `The site runs on Node.js ${process.versions.node}, which no longer gets security fixes`,
    passTitle: `Node.js ${process.versions.node} is supported`,
    fix: "cPanel → Setup Node.js App → choose Node.js 22 or newer for techbucket-site, then restart.",
  });

  /* ---------- Admin accounts and sign-ins ---------- */
  const users = await db.select().from(schema.users).where(eq(schema.users.active, true));
  const dormant = users.filter((u) => u.lastLoginAt && daysSince(u.lastLoginAt) > 90);
  const never = users.filter((u) => !u.lastLoginAt && daysSince(u.createdAt) > 14);
  c.check(dormant.length + never.length === 0, {
    id: "users-dormant",
    category: "security",
    severity: "warning",
    title: `${dormant.length + never.length} active admin account${dormant.length + never.length === 1 ? " is" : "s are"} not being used`,
    passTitle: "Every active admin account is in use",
    detail: listOf([
      ...dormant.map((u) => `${u.email}: last sign-in ${daysSince(u.lastLoginAt)} days ago`),
      ...never.map((u) => `${u.email}: never signed in`),
    ]),
    fix: "Deactivate accounts nobody uses. Each one is a way in.",
    href: "/admin/users",
  });
  const admins = users.filter((u) => u.role === "admin");
  c.check(admins.length <= 3, {
    id: "users-admins",
    category: "security",
    severity: "info",
    title: `${admins.length} people have full admin rights`,
    passTitle: `${admins.length} full admin account${admins.length === 1 ? "" : "s"}`,
    fix: "Give staff who only write content the Editor role.",
    href: "/admin/users",
  });
  const [failed] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.action, "login_failed"), gte(schema.auditLog.createdAt, sql`now() - interval '7 days'`)));
  c.check(failed.n <= 25, {
    id: "login-failures",
    category: "security",
    severity: failed.n > 200 ? "critical" : "warning",
    title: `${failed.n} failed admin sign-ins in the last 7 days`,
    passTitle: `${failed.n} failed admin sign-ins this week (normal)`,
    detail: "A high number usually means someone is guessing passwords.",
    fix: "Make sure every admin uses a long unique password; deactivate unused accounts.",
    href: "/admin/users",
  });

  /* ---------- Files on the server ---------- */
  if (production) {
    c.check(!existsSync(path.join(home, "techbucket-admin-login.txt")), {
      id: "login-file",
      category: "security",
      severity: "critical",
      title: "A file with an admin password is still on the server",
      passTitle: "No admin password file left on the server",
      detail: "~/techbucket-admin-login.txt",
      fix: "Sign in, change the password under My account, then delete the file in cPanel File Manager.",
    });
    let oldBackups: string[] = [];
    try {
      oldBackups = readdirSync(home).filter(
        (f) => f.startsWith("old-site-backup-") && daysSince(statSync(path.join(home, f)).mtime) > 30,
      );
    } catch {
      /* ignore */
    }
    c.check(oldBackups.length === 0, {
      id: "old-backup",
      category: "operations",
      severity: "info",
      title: "The old website backup is still on the server",
      passTitle: "No old-site backup lying around",
      detail: listOf(oldBackups),
      fix: "Download it to your computer, then delete it from the server.",
    });
    const loose = [path.join(process.cwd(), ".env"), path.join(home, ".techbucket-deploy", "env")].filter((f) => {
      try {
        return (statSync(f).mode & 0o077) !== 0;
      } catch {
        return false;
      }
    });
    c.check(loose.length === 0, {
      id: "env-perms",
      category: "security",
      severity: "warning",
      title: "Settings files with passwords can be read by other accounts on the server",
      passTitle: "Settings files are private (chmod 600)",
      detail: listOf(loose),
      fix: "cPanel File Manager → Permissions → set these files to 600.",
    });
  }

  /* ---------- Email, backups, logs, storage ---------- */
  const smtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  c.check(smtp, {
    id: "smtp",
    category: "operations",
    severity: "warning",
    title: "Email alerts are not set up",
    passTitle: "Email alerts are set up",
    detail: "New enquiries, job applications and this weekly report are not emailed to anyone.",
    fix: "Create noreply@techbucket.com.np in cPanel and add the SMTP_* lines to ~/.techbucket-deploy/env.",
  });
  const [settings] = await db.select({ to: schema.siteSettings.leadNotifyEmail }).from(schema.siteSettings).where(eq(schema.siteSettings.id, 1));
  c.check(!!settings?.to, {
    id: "notify-email",
    category: "operations",
    severity: "warning",
    title: "No email address set to receive enquiries",
    passTitle: "Enquiry alert address set",
    fix: "Site settings → Company & contact → Send new enquiries to.",
    href: "/admin/settings",
  });

  if (production) {
    const backupDir = path.join(home, "techbucket-backups");
    let newest = Infinity;
    try {
      for (const f of readdirSync(backupDir)) newest = Math.min(newest, daysSince(statSync(path.join(backupDir, f)).mtime));
    } catch {
      /* none */
    }
    c.check(newest <= 8, {
      id: "db-backup",
      category: "operations",
      severity: "critical",
      title: newest === Infinity ? "No database backup found" : `Last database backup is ${newest} days old`,
      passTitle: `Database backed up ${newest === 0 ? "today" : `${newest} day${newest === 1 ? "" : "s"} ago`}`,
      detail: "Backups are made weekly by the deploy cron job into ~/techbucket-backups.",
      fix: "Check ~/techbucket-deploy.log for backup errors. Also download a copy off the server now and then.",
    });

    const log = tail(path.join(home, "techbucket-deploy.log"));
    const since = new Date(Date.now() - 7 * DAY).toISOString().slice(0, 10);
    const errors = log
      .split("\n")
      .filter((l) => /ERROR/.test(l) && (l.match(/^\[(\d{4}-\d{2}-\d{2})/)?.[1] ?? "") >= since);
    c.check(errors.length === 0, {
      id: "deploy-errors",
      category: "operations",
      severity: "warning",
      title: `${errors.length} deploy error${errors.length === 1 ? "" : "s"} in the last 7 days`,
      passTitle: "Deploys ran without errors this week",
      detail: listOf(errors.slice(-5)),
      fix: "Read ~/techbucket-deploy.log in cPanel File Manager.",
    });
    const lastHealth = [...log.matchAll(/HTTP (\d{3}) from https?:\/\/\S+/g)].pop()?.[1];
    if (lastHealth)
      c.check(lastHealth === "200", {
        id: "deploy-health",
        category: "operations",
        severity: "critical",
        title: `The last deploy finished with the site returning HTTP ${lastHealth}`,
        passTitle: "Last deploy came up healthy (HTTP 200)",
        fix: "Check ~/techbucket-deploy.log and ~/techbucket-site/stderr.log.",
      });
    const stderr = path.join(process.cwd(), "stderr.log");
    if (existsSync(stderr)) {
      const st = statSync(stderr);
      const recent = daysSince(st.mtime) <= 7;
      const lines = recent ? tail(stderr, 60_000).split("\n").filter((l) => /\berror\b/i.test(l) && !/\[indexnow\]/.test(l)) : [];
      c.check(lines.length === 0, {
        id: "app-errors",
        category: "operations",
        severity: "info",
        title: `The app logged ${lines.length} error line${lines.length === 1 ? "" : "s"} recently`,
        passTitle: "No recent errors in the app log",
        detail: listOf(lines.slice(-5).map((l) => l.slice(0, 220))),
        fix: "Read ~/techbucket-site/stderr.log.",
      });
      c.check(st.size < 50 * 1024 * 1024, {
        id: "app-log-size",
        category: "operations",
        severity: "info",
        title: `The app error log is ${mb(st.size)}`,
        passTitle: "App error log is a sensible size",
        fix: "Empty ~/techbucket-site/stderr.log in File Manager.",
      });
    }
  }

  const uploads = dirSize(uploadRoot());
  const [dbSize] = await db.select({ n: sql<number>`pg_database_size(current_database())::bigint` }).from(sql`(select 1) as x`);
  c.check(uploads < 1024 * 1024 * 1024 && Number(dbSize.n) < 500 * 1024 * 1024, {
    id: "storage",
    category: "operations",
    severity: "info",
    title: `Storage is growing: uploads ${mb(uploads)}, database ${mb(Number(dbSize.n))}`,
    passTitle: `Storage fine (uploads ${mb(uploads)}, database ${mb(Number(dbSize.n))})`,
    fix: "Delete unused images in the Media library and old job applications.",
    href: "/admin/media",
  });
}
