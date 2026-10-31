import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

/**
 * Applies any pending SQL migrations from ./drizzle when the server starts,
 * so a redeploy with schema changes needs no manual step on cPanel.
 * Uses the same `_migrations` table as scripts/migrate.mjs. Never throws:
 * a failure is logged and the site keeps starting.
 */
export async function autoMigrate() {
  const url = process.env.DATABASE_URL;
  const dir = path.join(process.cwd(), "drizzle");
  if (!url || !existsSync(dir)) return;

  const client = new Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  try {
    await client.connect();
    // Only one app process should migrate at a time.
    await client.query("select pg_advisory_lock(727274)");
    await client.query(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const done = new Set((await client.query("select name from _migrations")).rows.map((r) => r.name as string));
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (done.has(file)) continue;
      const statements = readFileSync(path.join(dir, file), "utf8")
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);
      await client.query("begin");
      try {
        for (const st of statements) await client.query(st);
        await client.query("insert into _migrations (name) values ($1)", [file]);
        await client.query("commit");
        console.log(`[migrate] applied ${file}`);
      } catch (e) {
        await client.query("rollback");
        console.error(`[migrate] ${file} failed:`, (e as Error).message);
        return;
      }
    }
  } catch (e) {
    console.error("[migrate] skipped:", (e as Error).message);
  } finally {
    await client.query("select pg_advisory_unlock(727274)").catch(() => {});
    await client.end().catch(() => {});
  }
}
