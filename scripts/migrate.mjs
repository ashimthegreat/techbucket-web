// Applies SQL migrations from ./drizzle in order, once each.
// Needs only the "pg" package, so it runs on cPanel. Usage: node scripts/migrate.mjs
import "./load-env.mjs";
import pg from "pg";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, "..", "drizzle");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (add it to .env or the cPanel environment variables).");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(
    `create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`,
  );
  const done = new Set((await client.query("select name from _migrations")).rows.map((r) => r.name));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = readFileSync(path.join(dir, file), "utf8");
    const statements = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    await client.query("begin");
    try {
      for (const st of statements) await client.query(st);
      await client.query("insert into _migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`+ applied ${file}`);
      applied++;
    } catch (e) {
      await client.query("rollback");
      throw new Error(`Migration ${file} failed: ${e.message}`);
    }
  }
  console.log(applied ? `Done: ${applied} migration(s) applied.` : "Database is up to date.");
} catch (e) {
  console.error(e.message ?? e);
  process.exitCode = 1;
} finally {
  await client.end();
}
