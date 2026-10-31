import "server-only";
import { headers } from "next/headers";

// Simple in-memory fixed-window limiter. Good enough for a single
// Passenger/Node process on cPanel; resets when the app restarts.
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const ip = await clientIp();
  const id = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(id);
  if (!b || b.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return { ok: true, ip };
  }
  b.count += 1;
  return { ok: b.count <= limit, ip };
}
