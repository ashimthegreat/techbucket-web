import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ChatMessage, ChatSession } from "@/db/schema";
import { messagesAfter, sessionByToken, startSession, visitorSend } from "@/lib/chat/engine";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const publicMessage = (m: ChatMessage) => ({ id: m.id, role: m.role, body: m.body, meta: m.meta ?? null, at: m.createdAt });

async function payload(session: ChatSession, after: number) {
  const [fresh] = await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.id, session.id));
  const msgs = await messagesAfter(session.id, after);
  return {
    token: fresh.token,
    status: fresh.status,
    hasContact: !!(fresh.visitorEmail || fresh.visitorPhone),
    messages: msgs.map(publicMessage),
  };
}

async function enabled() {
  const [s] = await db.select({ on: schema.siteSettings.chatEnabled }).from(schema.siteSettings).where(eq(schema.siteSettings.id, 1));
  return !!s?.on;
}

/** Visitor polls for new messages (team replies). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const session = await sessionByToken(url.searchParams.get("token"));
  if (!session) return Response.json({ error: "not_found" }, { status: 404 });
  await db.update(schema.chatSessions).set({ visitorSeenAt: new Date() }).where(eq(schema.chatSessions.id, session.id));
  return Response.json(await payload(session, Number(url.searchParams.get("after")) || 0));
}

/** Start a chat, send a message, share contact details or ask for a person. */
export async function POST(req: Request) {
  if (!(await enabled())) return Response.json({ error: "Chat is not available right now." }, { status: 503 });
  const limit = await rateLimit("chat", 40, 10 * 60 * 1000);
  if (!limit.ok) return Response.json({ error: "You're sending messages too quickly. Please wait a few minutes." }, { status: 429 });
  let body: { token?: string; text?: string; contact?: Record<string, string>; handoff?: boolean; page?: string; after?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const h = await headers();
  let session = await sessionByToken(body.token);
  let after = Number(body.after) || 0;
  if (!session) {
    session = await startSession({ page: body.page, ip: limit.ip, userAgent: h.get("user-agent") ?? undefined });
    after = 0;
  }
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);
  const contact = body.contact
    ? { name: str(body.contact.name, 160), email: str(body.contact.email, 200), phone: str(body.contact.phone, 60), organisation: str(body.contact.organisation, 200) }
    : undefined;
  if (body.text || contact || body.handoff) {
    const r = await visitorSend(session, { text: str(body.text, 1500), contact, handoff: body.handoff === true, page: str(body.page, 500) });
    if ("error" in r && r.error) return Response.json({ error: r.error, ...(await payload(session, after)) }, { status: 400 });
  }
  return Response.json(await payload(session, after));
}
