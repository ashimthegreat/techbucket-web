import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { healthToken, runHealthCheck } from "@/lib/health/run";

export const dynamic = "force-dynamic";

/**
 * Called weekly by the cPanel deploy cron job:
 *   curl -X POST -H "Authorization: Bearer <token>" https://techbucket.com.np/api/cron/health
 * Responds at once and runs the checks in the background.
 */
export async function POST(req: Request) {
  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(healthToken());
  if (!process.env.SESSION_SECRET || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  after(async () => {
    try {
      await runHealthCheck("schedule");
    } catch (e) {
      console.error("[health] scheduled run failed:", e);
    }
  });
  return Response.json({ started: true }, { status: 202 });
}
