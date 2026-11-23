import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { agentSend, messagesAfter, setChatStatus, visitorOnline } from "@/lib/chat/engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string) {
  const [s] = await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.id, Number(id)));
  return s ?? null;
}

async function payload(sessionId: number, after: number) {
  const [s] = await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.id, sessionId));
  const messages = await messagesAfter(sessionId, after);
  return {
    status: s.status,
    visitorOnline: visitorOnline(s),
    visitor: { name: s.visitorName, email: s.visitorEmail, phone: s.visitorPhone, org: s.visitorOrg, page: s.page, topic: s.topic },
    leadId: s.leadId,
    messages: messages.map((m) => ({ id: m.id, role: m.role, body: m.body, meta: m.meta, at: m.createdAt })),
  };
}

export async function GET(req: Request, { params }: Ctx) {
  if (!(await getCurrentUser())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const session = await load((await params).id);
  if (!session) return Response.json({ error: "not_found" }, { status: 404 });
  await db.update(schema.chatSessions).set({ adminSeenAt: new Date() }).where(eq(schema.chatSessions.id, session.id));
  return Response.json(await payload(session.id, Number(new URL(req.url).searchParams.get("after")) || 0));
}

export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const session = await load((await params).id);
  if (!session) return Response.json({ error: "not_found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { text?: string; action?: string; after?: number };
  if (body.action === "close" || body.action === "bot") await setChatStatus(session, body.action === "close" ? "closed" : "bot", user);
  else if (typeof body.text === "string" && body.text.trim()) await agentSend(session, user, body.text);
  else return Response.json({ error: "Nothing to send" }, { status: 400 });
  return Response.json(await payload(session.id, Number(body.after) || 0));
}
