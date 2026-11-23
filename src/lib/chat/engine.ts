import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, gt, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ChatCard, ChatMessage, ChatMeta, ChatSession } from "@/db/schema";
import { open } from "@/lib/secret-box";
import { notify, sendMail } from "@/lib/mail";
import { siteUrl } from "@/lib/utils";
import { aiReply, DEFAULT_MODEL, type AiTurn } from "./ai";
import { fallbackReply } from "./fallback";
import { knowledge } from "./knowledge";

const { chatSessions, chatMessages, siteSettings, users, leads } = schema;

export const VISITOR_AWAY_MS = 2 * 60 * 1000;

export function visitorOnline(s: { visitorSeenAt: Date | string }) {
  return Date.now() - new Date(s.visitorSeenAt).getTime() < VISITOR_AWAY_MS;
}

async function settings() {
  const [s] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
  return s;
}

async function assignee(s: Awaited<ReturnType<typeof settings>>) {
  if (s.chatAssigneeId) {
    const [u] = await db.select().from(users).where(and(eq(users.id, s.chatAssigneeId), eq(users.active, true)));
    if (u) return u;
  }
  // Nobody chosen (or deactivated): fall back to the first active admin.
  const [u] = await db.select().from(users).where(and(eq(users.role, "admin"), eq(users.active, true))).orderBy(asc(users.id)).limit(1);
  return u ?? null;
}

async function addMessage(sessionId: number, role: ChatMessage["role"], body: string, meta?: ChatMeta, agentId?: number) {
  const [m] = await db.insert(chatMessages).values({ sessionId, role, body, meta, agentId }).returning();
  await db.update(chatSessions).set({ lastMessageAt: new Date() }).where(eq(chatSessions.id, sessionId));
  return m;
}

export async function sessionByToken(token: string | null | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [s] = await db.select().from(chatSessions).where(eq(chatSessions.token, token));
  return s ?? null;
}

export async function messagesAfter(sessionId: number, afterId = 0) {
  return db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.sessionId, sessionId), gt(chatMessages.id, afterId)))
    .orderBy(asc(chatMessages.id))
    .limit(200);
}

export async function startSession(opts: { page?: string; ip?: string; userAgent?: string }) {
  const s = await settings();
  const [session] = await db
    .insert(chatSessions)
    .values({ token: randomBytes(24).toString("base64url"), page: opts.page?.slice(0, 500), ip: opts.ip, userAgent: opts.userAgent?.slice(0, 500) })
    .returning();
  await addMessage(session.id, "bot", s.chatWelcome?.trim() || `Namaste! I'm the ${s.companyName} assistant. Ask me about our services, or I can connect you with our team.`, {
    quickReplies: ["Our services", "Get a quote", "Talk to a person"],
  });
  return session;
}

/** Turns the conversation into an enquiry (case) assigned to the chosen admin user. */
async function ensureCase(session: ChatSession): Promise<ChatSession> {
  const s = await settings();
  const owner = await assignee(s);
  const visitorLines = (await messagesAfter(session.id))
    .filter((m) => m.role === "visitor")
    .map((m) => m.body)
    .join("\n");
  const fields = {
    name: session.visitorName || "Website visitor",
    email: session.visitorEmail || "",
    phone: session.visitorPhone || "",
    organisation: session.visitorOrg || "",
    service: (session.topic || "").slice(0, 160),
  };
  if (session.leadId) {
    await db.update(leads).set(fields).where(eq(leads.id, session.leadId));
    return session;
  }
  const [lead] = await db
    .insert(leads)
    .values({
      ...fields,
      message: `Website chat:\n${visitorLines}`.slice(0, 5000),
      source: "chat",
      assignedTo: owner?.id ?? null,
      ip: session.ip,
      userAgent: session.userAgent,
    })
    .returning({ id: leads.id });
  const [updated] = await db
    .update(chatSessions)
    .set({ leadId: lead.id, assignedTo: session.assignedTo ?? owner?.id ?? null })
    .where(eq(chatSessions.id, session.id))
    .returning();
  return updated;
}

async function transcript(sessionId: number) {
  return (await messagesAfter(sessionId))
    .filter((m) => m.role !== "system")
    .slice(-20)
    .map((m) => `${m.role === "visitor" ? "Visitor" : m.role === "agent" ? "Team" : "Assistant"}: ${m.body}`)
    .join("\n");
}

/** Visitor asked for a person (or the assistant decided to hand off). */
async function requestHuman(session: ChatSession, reason: string) {
  session = await ensureCase(session);
  if (session.status === "waiting" || session.status === "live") return session;
  const [updated] = await db.update(chatSessions).set({ status: "waiting" }).where(eq(chatSessions.id, session.id)).returning();
  await addMessage(session.id, "system", "Waiting for a team member to join.");
  const s = await settings();
  const owner = session.assignedTo ? (await db.select().from(users).where(eq(users.id, session.assignedTo)))[0] : await assignee(s);
  if (owner) {
    const who = [session.visitorName, session.visitorOrg].filter(Boolean).join(", ") || "A visitor";
    await notify(
      owner.email,
      `Live chat: ${who} is waiting${session.topic ? ` (${session.topic})` : ""}`,
      `${who} wants to talk to the team on the website.\nReason: ${reason}\n\nEmail: ${session.visitorEmail || "not given"}\nPhone: ${session.visitorPhone || "not given"}\nPage: ${session.page || ""}\n\n${await transcript(session.id)}\n\nJoin the chat: ${siteUrl(`/admin/chats/${session.id}`)}`,
      "chat_handoff",
      session.visitorEmail || undefined,
    );
  }
  return updated;
}

async function aiUsedToday() {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(chatMessages)
    .where(and(eq(chatMessages.role, "bot"), sql`(${chatMessages.meta}->>'ai')::boolean`, gte(chatMessages.createdAt, sql`date_trunc('day', now())`)));
  return r.n;
}

function history(msgs: ChatMessage[]): AiTurn[] {
  const turns: AiTurn[] = [];
  for (const m of msgs.slice(-24)) {
    if (m.role === "system") continue;
    const role = m.role === "visitor" ? "user" : "assistant";
    const content = m.role === "agent" ? `[Team member ${m.meta?.agentName ?? ""}] ${m.body}` : m.body;
    const last = turns[turns.length - 1];
    if (last?.role === role) last.content += `\n${content}`;
    else turns.push({ role, content });
  }
  while (turns[0]?.role === "assistant") turns.shift();
  return turns;
}

const cleanEmail = (e?: string) => (e && /^\S+@\S+\.\S+$/.test(e.trim()) ? e.trim().toLowerCase().slice(0, 200) : undefined);
const cleanPhone = (p?: string) => (p && /\d{6,}/.test(p.replace(/[\s-]/g, "")) ? p.trim().slice(0, 60) : undefined);

/** Handles one message (or action) from the visitor and lets the assistant answer when it's in charge. */
export async function visitorSend(
  session: ChatSession,
  input: { text?: string; contact?: { name?: string; email?: string; phone?: string; organisation?: string }; handoff?: boolean; page?: string },
) {
  const now = new Date();
  await db
    .update(chatSessions)
    .set({ visitorSeenAt: now, ...(input.page ? { page: input.page.slice(0, 500) } : {}), ...(session.status === "closed" ? { status: "bot" } : {}) })
    .where(eq(chatSessions.id, session.id));
  if (session.status === "closed") session = { ...session, status: "bot" };

  // Contact form inside the chat.
  if (input.contact) {
    const c = input.contact;
    const patch = {
      visitorName: c.name?.trim().slice(0, 160) || session.visitorName,
      visitorEmail: cleanEmail(c.email) ?? session.visitorEmail,
      visitorPhone: cleanPhone(c.phone) ?? session.visitorPhone,
      visitorOrg: c.organisation?.trim().slice(0, 200) || session.visitorOrg,
    };
    if (!patch.visitorEmail && !patch.visitorPhone) return { error: "Please enter an email address or a phone number." };
    [session] = await db.update(chatSessions).set(patch).where(eq(chatSessions.id, session.id)).returning();
    await addMessage(session.id, "visitor", [patch.visitorName, patch.visitorEmail, patch.visitorPhone, patch.visitorOrg].filter(Boolean).join(" · "));
    session = await ensureCase(session);
    if (session.status === "bot") session = await requestHuman(session, "Left contact details");
    const s = await settings();
    const owner = session.assignedTo ? (await db.select().from(users).where(eq(users.id, session.assignedTo)))[0] : null;
    await addMessage(
      session.id,
      "bot",
      `Thank you${patch.visitorName ? `, ${patch.visitorName.split(" ")[0]}` : ""}! ${owner ? owner.name.split(" ")[0] : "Our team"} has been notified and will reply here shortly${patch.visitorEmail ? `, or by email to ${patch.visitorEmail} if you've left` : ""}. For anything urgent, call ${s.phonePrimary}.`,
    );
    return { session };
  }

  if (input.handoff) {
    await addMessage(session.id, "visitor", "Talk to a person");
    session = await requestHuman(session, "Visitor asked for a person");
    if (!session.visitorEmail && !session.visitorPhone) {
      await addMessage(session.id, "bot", "Sure, I've asked our team to join. So they can reach you even if you leave this page, please share your name and email or phone.", { askContact: true });
    } else {
      await addMessage(session.id, "bot", "Sure, our team has been notified and will join this chat shortly.");
    }
    return { session };
  }

  const text = (input.text ?? "").trim().slice(0, 1500);
  if (!text) return { session };
  await addMessage(session.id, "visitor", text);

  // A person is handling (or about to handle) the chat: the assistant stays quiet.
  if (session.status === "live" || session.status === "waiting") {
    if (session.status === "waiting" && session.assignedTo && (!session.adminSeenAt || Date.now() - session.adminSeenAt.getTime() > 15 * 60 * 1000)) {
      const [owner] = await db.select().from(users).where(eq(users.id, session.assignedTo));
      const recentNotice = await db
        .select({ id: schema.emailLog.id })
        .from(schema.emailLog)
        .where(and(eq(schema.emailLog.kind, "chat_message"), gte(schema.emailLog.createdAt, sql`now() - interval '15 minutes'`), sql`${schema.emailLog.subject} like ${`%#${session.id}%`}`));
      if (owner && recentNotice.length === 0)
        await notify(owner.email, `Live chat #${session.id}: new message from ${session.visitorName || "visitor"}`, `${text}\n\nReply: ${siteUrl(`/admin/chats/${session.id}`)}`, "chat_message");
    }
    return { session };
  }

  const s = await settings();
  const k = await knowledge();
  const owner = await assignee(s);
  const apiKey = open(s.chatAiKeyEnc);
  let reply;
  let usedAi = false;
  if (apiKey && (await aiUsedToday()) < s.chatDailyLimit) {
    try {
      reply = await aiReply({
        apiKey,
        model: s.chatAiModel || DEFAULT_MODEL,
        knowledge: k,
        history: history(await messagesAfter(session.id)),
        staffName: owner ? owner.name.split(" ")[0] : null,
      });
      usedAi = true;
    } catch (e) {
      console.error("[chat] AI failed:", (e as Error).message);
    }
  }
  reply ??= fallbackReply(k, text);

  const cards = reply.cards.map((id) => k.cards.get(id)).filter(Boolean) as ChatCard[];
  const patch = {
    visitorName: reply.contact.name?.trim().slice(0, 160) || session.visitorName,
    visitorEmail: cleanEmail(reply.contact.email) ?? session.visitorEmail,
    visitorPhone: cleanPhone(reply.contact.phone) ?? session.visitorPhone,
    visitorOrg: reply.contact.organisation?.trim().slice(0, 200) || session.visitorOrg,
    topic: reply.topic || session.topic,
  };
  [session] = await db.update(chatSessions).set(patch).where(eq(chatSessions.id, session.id)).returning();
  const hasContact = !!(session.visitorEmail || session.visitorPhone);
  await addMessage(session.id, "bot", reply.message, {
    cards: cards.length ? cards : undefined,
    quickReplies: reply.quickReplies.length ? reply.quickReplies : undefined,
    askContact: (reply.askContact || reply.handoff) && !hasContact ? true : undefined,
    ai: usedAi || undefined,
  });
  if (hasContact) session = await ensureCase(session);
  if (reply.handoff) session = await requestHuman(session, reply.topic || "Assistant handed over");
  return { session };
}

/** A team member replies from the admin. Emails the visitor if they've left the page. */
export async function agentSend(session: ChatSession, agent: { id: number; name: string }, text: string) {
  const body = text.trim().slice(0, 4000);
  if (!body) return;
  if (session.status !== "live") await addMessage(session.id, "system", `${agent.name} joined the chat.`);
  await addMessage(session.id, "agent", body, { agentName: agent.name.split(" ")[0] }, agent.id);
  await db
    .update(chatSessions)
    .set({ status: "live", adminSeenAt: new Date(), assignedTo: session.assignedTo ?? agent.id })
    .where(eq(chatSessions.id, session.id));
  if (session.leadId) await db.update(leads).set({ status: "contacted" }).where(and(eq(leads.id, session.leadId), eq(leads.status, "new")));
  const away = Date.now() - new Date(session.visitorSeenAt).getTime() > VISITOR_AWAY_MS;
  if (away && session.visitorEmail) {
    const s = await settings();
    await sendMail({
      to: session.visitorEmail,
      subject: `Reply from ${s.companyName}`,
      text: `Namaste${session.visitorName ? ` ${session.visitorName.split(" ")[0]}` : ""},\n\n${agent.name} from ${s.companyName} replied to your chat:\n\n${body}\n\nContinue the conversation: ${siteUrl(`/?chat=${session.token}`)}\nOr simply reply to this email.\n\n${s.companyName} · ${s.phonePrimary}`,
      kind: "chat_reply",
      replyTo: s.email,
      leadId: session.leadId ?? undefined,
      sentBy: agent.id,
      keepBody: true,
    });
  }
}

export async function setChatStatus(session: ChatSession, status: "bot" | "closed", by: { name: string }) {
  await db.update(chatSessions).set({ status, adminSeenAt: new Date() }).where(eq(chatSessions.id, session.id));
  await addMessage(
    session.id,
    "system",
    status === "closed" ? `${by.name} closed the chat.` : `${by.name} handed the chat back to the assistant.`,
  );
}
