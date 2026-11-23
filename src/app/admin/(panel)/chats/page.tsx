import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Empty, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { InboxRefresher } from "@/components/admin/chat";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Live chat" };

const TABS = [
  { key: "active", label: "Needs a person", statuses: ["waiting", "live"] },
  { key: "bot", label: "With assistant", statuses: ["bot"] },
  { key: "closed", label: "Closed", statuses: ["closed"] },
  { key: "all", label: "All", statuses: ["waiting", "live", "bot", "closed"] },
];

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function ChatsPage({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];
  const { chatSessions, chatMessages, users } = schema;
  const rows = await db
    .select({
      s: chatSessions,
      assignee: users.name,
      count: sql<number>`(select count(*)::int from ${chatMessages} m where m.session_id = ${chatSessions.id} and m.role = 'visitor')`,
      last: sql<string>`(select m.body from ${chatMessages} m where m.session_id = ${chatSessions.id} and m.role <> 'system' order by m.id desc limit 1)`,
    })
    .from(chatSessions)
    .leftJoin(users, eq(users.id, chatSessions.assignedTo))
    .where(and(inArray(chatSessions.status, tab.statuses), sql`exists (select 1 from ${chatMessages} m where m.session_id = ${chatSessions.id} and m.role = 'visitor')`))
    .orderBy(sql`case ${chatSessions.status} when 'waiting' then 0 when 'live' then 1 else 2 end`, desc(chatSessions.lastMessageAt))
    .limit(100);

  return (
    <>
      <PageHeader title="Live chat" description="Conversations from the website chat. The assistant answers first; chats appear under “Needs a person” when a visitor asks for the team." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin/chats?tab=${t.key}`}
              className={cn("border px-3 py-1.5 font-semibold", t.key === tab.key ? "border-ink bg-ink text-white" : "border-hair bg-white")}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <InboxRefresher />
      </div>
      {rows.length === 0 ? (
        <Empty>No conversations here yet.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Visitor</Th>
              <Th>Last message</Th>
              <Th>Status</Th>
              <Th>Assigned</Th>
              <Th>Updated</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, assignee, count, last }) => (
              <tr key={s.id} className={s.status === "waiting" ? "bg-accent-wash/40" : undefined}>
                <Td>
                  <Link href={`/admin/chats/${s.id}`} className="font-semibold underline-offset-4 hover:underline">
                    {s.visitorName || `Visitor #${s.id}`}
                  </Link>
                  <span className="block text-xs text-subtle">{[s.visitorOrg, s.visitorEmail || s.visitorPhone].filter(Boolean).join(" · ") || "No contact details yet"}</span>
                </Td>
                <Td className="max-w-[340px]">
                  <span className="line-clamp-2 text-muted">{last}</span>
                  <span className="text-xs text-subtle">{count} visitor message{count === 1 ? "" : "s"}{s.topic ? ` · ${s.topic}` : ""}</span>
                </Td>
                <Td>
                  <Badge value={s.status} label={{ waiting: "Waiting", live: "Live", bot: "Assistant", closed: "Closed" }[s.status]} />
                </Td>
                <Td>{assignee ?? "—"}</Td>
                <Td className="whitespace-nowrap">{formatDateTime(s.lastMessageAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
