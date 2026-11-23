"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChatMeta } from "@/db/schema";

/** Short two-tone chime made in the browser (no audio file needed). */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.3);
    });
  } catch {
    /* sound blocked until the page is clicked once */
  }
}

function desktopNotice(title: string, body: string, href: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      const n = new Notification(title, { body, tag: href });
      n.onclick = () => {
        window.focus();
        window.location.href = href;
      };
    }
  } catch {
    /* unsupported */
  }
}

/**
 * Runs on every admin page: checks for chats waiting for a person and new
 * visitor messages, then chimes, shows a desktop notification and flags the tab title.
 */
export function ChatNotifier() {
  const last = useRef<{ waiting: number; msg: number } | null>(null);
  const router = useRouter();
  useEffect(() => {
    const base = document.title;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/admin/chats/summary", { cache: "no-store" });
        if (!r.ok || !alive) return;
        const d = (await r.json()) as { waiting: number; lastVisitorMessage: number };
        const prev = last.current;
        if (prev && (d.waiting > prev.waiting || d.lastVisitorMessage > prev.msg)) {
          const onChatPage = /^\/admin\/chats\/\d+/.test(window.location.pathname);
          if (d.waiting > prev.waiting) {
            chime();
            desktopNotice("Visitor waiting in live chat", "Someone wants to talk to the team.", "/admin/chats");
            router.refresh();
          } else if (!onChatPage && d.lastVisitorMessage > prev.msg) {
            chime();
          }
        }
        document.title = d.waiting > 0 ? `(${d.waiting}) Chat waiting · ${base.replace(/^\(\d+\) Chat waiting · /, "")}` : base.replace(/^\(\d+\) Chat waiting · /, "");
        last.current = { waiting: d.waiting, msg: d.lastVisitorMessage };
      } catch {
        /* next tick */
      }
    };
    void tick();
    const t = window.setInterval(tick, 12000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [router]);
  return null;
}

/** Refreshes the inbox list every few seconds. */
export function InboxRefresher() {
  const router = useRouter();
  const [perm, setPerm] = useState<string>("default");
  useEffect(() => {
    const t = window.setInterval(() => !document.hidden && router.refresh(), 8000);
    if ("Notification" in window) window.setTimeout(() => setPerm(Notification.permission), 0);
    return () => window.clearInterval(t);
  }, [router]);
  if (perm !== "default") return null;
  return (
    <button
      type="button"
      onClick={async () => {
        chime();
        setPerm(await Notification.requestPermission());
      }}
      className="border border-ink bg-white px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white"
    >
      Turn on desktop alerts
    </button>
  );
}

type Msg = { id: number; role: string; body: string; meta: ChatMeta | null; at: string };
type Data = {
  status: string;
  visitorOnline: boolean;
  visitor: { name: string | null; email: string | null; phone: string | null; org: string | null; page: string | null; topic: string | null };
  leadId: number | null;
  messages: Msg[];
};

const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" }).format(new Date(iso));

/** The live conversation: polls for visitor messages and sends replies. */
export function ChatConsole({ id, initial }: { id: number; initial: Data }) {
  const [data, setData] = useState<Data>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef(initial.messages.at(-1)?.id ?? 0);

  const apply = useCallback((d: Data) => {
    setData((prev) => {
      const seen = new Set(prev.messages.map((m) => m.id));
      const fresh = d.messages.filter((m) => !seen.has(m.id));
      if (fresh.some((m) => m.role === "visitor") && document.hidden) chime();
      const messages = [...prev.messages, ...fresh];
      lastRef.current = messages.at(-1)?.id ?? lastRef.current;
      return { ...d, messages };
    });
  }, []);

  useEffect(() => {
    const t = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/admin/chats/${id}?after=${lastRef.current}`, { cache: "no-store" });
        if (r.ok) apply(await r.json());
      } catch {
        /* next tick */
      }
    }, 2500);
    return () => window.clearInterval(t);
  }, [id, apply]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [data.messages.length]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/chats/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, after: lastRef.current }),
      });
      const d = await r.json();
      if (!r.ok) setError(d.error ?? "Failed");
      else apply(d);
      return r.ok;
    } catch {
      setError("Couldn't reach the server.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const v = data.visitor;
  const statusLabel = { bot: "Assistant answering", waiting: "Waiting for you", live: "You're chatting", closed: "Closed" }[data.status] ?? data.status;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="flex h-[calc(100vh-15rem)] min-h-[480px] flex-col border border-hair bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-5 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className={`h-2.5 w-2.5 ${data.status === "waiting" ? "bg-accent" : data.status === "live" ? "bg-emerald-500" : data.status === "bot" ? "bg-sky-500" : "bg-fog"}`} />
            {statusLabel}
            <span className="font-normal text-subtle">· visitor {data.visitorOnline ? "on the site now" : "away (replies are emailed)"}</span>
          </span>
          <span className="flex gap-2">
            {data.status !== "bot" && data.status !== "closed" && (
              <button type="button" disabled={busy} onClick={() => post({ action: "bot" })} className="border border-hair px-3 py-1.5 text-sm font-semibold hover:border-ink">
                Hand back to assistant
              </button>
            )}
            {data.status !== "closed" && (
              <button type="button" disabled={busy} onClick={() => post({ action: "close" })} className="border border-hair px-3 py-1.5 text-sm font-semibold hover:border-ink">
                Close chat
              </button>
            )}
          </span>
        </div>
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-mist px-5 py-5">
          {data.messages.map((m) =>
            m.role === "system" ? (
              <p key={m.id} className="text-center text-xs text-subtle">
                {m.body} · {time(m.at)}
              </p>
            ) : (
              <div key={m.id} className={`flex flex-col ${m.role === "visitor" ? "items-start" : "items-end"}`}>
                <span className="mb-1 text-xs text-subtle">
                  {m.role === "visitor" ? v.name || "Visitor" : m.role === "agent" ? m.meta?.agentName || "Team" : m.meta?.ai ? "AI assistant" : "Assistant"} · {time(m.at)}
                </span>
                <div
                  className={`max-w-[80%] px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                    m.role === "visitor" ? "border border-hair bg-white" : m.role === "agent" ? "bg-ink text-white" : "border border-sky-100 bg-sky-50"
                  }`}
                >
                  {m.body}
                </div>
                {m.meta?.cards && <span className="mt-1 text-xs text-subtle">Showed: {m.meta.cards.map((c) => c.title).join(", ")}</span>}
              </div>
            ),
          )}
        </div>
        <form
          className="border-t border-hair p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            if (await post({ text })) setText("");
          }}
        >
          <div className="flex items-end gap-2">
            <label htmlFor="reply" className="sr-only">
              Reply
            </label>
            <textarea
              id="reply"
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget.form as HTMLFormElement).requestSubmit();
                }
              }}
              placeholder={data.status === "live" ? "Write a reply… (Enter to send, Shift+Enter for a new line)" : "Write a reply to take over from the assistant…"}
              className="max-h-40 min-h-12 flex-1 resize-y border border-line px-3 py-2.5 text-[15px] focus:border-ink focus:outline-none"
            />
            <button type="submit" disabled={busy || !text.trim()} className="h-12 bg-ink px-5 font-semibold text-white hover:bg-charcoal disabled:opacity-40">
              Send
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </form>
      </div>

      <aside className="space-y-4">
        <div className="border border-hair bg-white p-5 text-sm">
          <p className="mb-3 text-xs font-semibold tracking-[0.1em] text-subtle uppercase">Visitor</p>
          <dl className="space-y-2">
            {[
              ["Name", v.name],
              ["Organisation", v.org],
              ["Email", v.email],
              ["Phone", v.phone],
              ["Needs", v.topic],
              ["Page", v.page],
            ].map(([k, val]) => (
              <div key={k}>
                <dt className="text-xs text-subtle">{k}</dt>
                <dd className="break-words">{val || "—"}</dd>
              </div>
            ))}
          </dl>
          {data.leadId && (
            <Link href={`/admin/leads/${data.leadId}`} className="mt-4 inline-block font-semibold underline-offset-4 hover:underline">
              Open the case (enquiry) →
            </Link>
          )}
        </div>
        <p className="text-xs text-subtle">
          Replying takes the chat over from the assistant. If the visitor has left, your reply is also emailed to them (when they gave an email) with a link back to this chat.
        </p>
      </aside>
    </div>
  );
}
