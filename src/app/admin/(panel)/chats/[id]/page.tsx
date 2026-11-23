import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ChatConsole } from "@/components/admin/chat";
import { messagesAfter, visitorOnline } from "@/lib/chat/engine";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Chat" };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  const [s] = Number.isInteger(id) ? await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.id, id)) : [];
  if (!s) notFound();
  await db.update(schema.chatSessions).set({ adminSeenAt: new Date() }).where(eq(schema.chatSessions.id, id));
  const messages = await messagesAfter(id);
  return (
    <>
      <Link href="/admin/chats" className="mb-4 inline-block text-sm font-medium text-subtle hover:text-ink">
        ← Live chat
      </Link>
      <PageHeader title={s.visitorName || `Visitor #${s.id}`} description={`Started ${formatDateTime(s.createdAt)}${s.page ? ` on ${s.page}` : ""}`} />
      <ChatConsole
        id={id}
        initial={{
          status: s.status,
          visitorOnline: visitorOnline(s),
          visitor: { name: s.visitorName, email: s.visitorEmail, phone: s.visitorPhone, org: s.visitorOrg, page: s.page, topic: s.topic },
          leadId: s.leadId,
          messages: messages.map((m) => ({ id: m.id, role: m.role, body: m.body, meta: m.meta, at: m.createdAt.toISOString() })),
        }}
      />
    </>
  );
}
