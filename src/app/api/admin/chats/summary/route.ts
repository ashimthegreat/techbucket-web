import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** For the admin's live notifications: how many chats wait for a person, and the newest visitor message. */
export async function GET() {
  if (!(await getCurrentUser())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const [r] = await db
    .select({
      waiting: sql<number>`count(*) filter (where ${schema.chatSessions.status} = 'waiting')::int`,
      live: sql<number>`count(*) filter (where ${schema.chatSessions.status} = 'live')::int`,
    })
    .from(schema.chatSessions);
  const [m] = await db
    .select({ id: sql<number>`coalesce(max(${schema.chatMessages.id}), 0)::int` })
    .from(schema.chatMessages)
    .innerJoin(schema.chatSessions, sql`${schema.chatSessions.id} = ${schema.chatMessages.sessionId}`)
    // Only messages in chats a person is handling; the assistant deals with the rest.
    .where(sql`${schema.chatMessages.role} = 'visitor' and ${schema.chatSessions.status} in ('waiting', 'live')`);
  return Response.json({ waiting: r.waiting, live: r.live, lastVisitorMessage: m.id });
}
