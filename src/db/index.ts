import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DB = NodePgDatabase<typeof schema>;

declare global {
  var __tbDb: { pool: Pool; db: DB } | undefined;
}

function init() {
  if (globalThis.__tbDb) return globalThis.__tbDb;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const pool = new Pool({
    connectionString,
    // Shared hosting limits connections, so keep the pool small.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  globalThis.__tbDb = { pool, db: drizzle(pool, { schema }) };
  return globalThis.__tbDb;
}

/**
 * Lazily-connected database. The pool is only created on first query,
 * so `next build` works without a database connection.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = init().db as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export { schema };
