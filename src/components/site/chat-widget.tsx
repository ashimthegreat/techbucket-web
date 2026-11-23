"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ChatMeta } from "@/db/schema";

type Msg = { id: number; role: "visitor" | "bot" | "agent" | "system"; body: string; meta: ChatMeta | null; at: string };
type State = { token: string; status: string; hasContact: boolean; messages: Msg[] };

const KEY = "tb_chat";
const TEASER_KEY = "tb_chat_teaser";

const store = {
  get: (k: string) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* private mode */
    }
  },
};

/** Plain text with clickable links. */
function Text({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+|\/(?:services|industries|case-studies|insights|contact|careers)[^\s,.)]*)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^(https?:\/\/|\/)/.test(p) ? (
          <a key={i} href={p} className="break-all underline underline-offset-2" target={p.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M4 5h16v11H9l-5 4z" strokeLinejoin="round" />
      <path d="M8 9.5h8M8 12.5h5" strokeLinecap="round" />
    </svg>
  );
}

export function ChatWidget({ companyName: fullName, teaser, ai }: { companyName: string; teaser: string; ai: boolean }) {
  const companyName = fullName.replace(/\s+(pvt\.?|private)\s+(ltd\.?|limited)$/i, "");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [showTeaser, setShowTeaser] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stateRef = useRef<State | null>(null);
  const openRef = useRef(open);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const merge = useCallback((data: State) => {
    setState((prev) => {
      if (!prev || prev.token !== data.token) return data;
      const seen = new Set(prev.messages.map((m) => m.id));
      const fresh = data.messages.filter((m) => !seen.has(m.id));
      if (!openRef.current) setUnread((u) => u + fresh.filter((m) => m.role === "agent").length);
      return { ...data, messages: [...prev.messages, ...fresh] };
    });
    store.set(KEY, data.token);
  }, []);

  const lastId = () => Math.max(0, ...(stateRef.current?.messages ?? []).map((m) => m.id));

  const send = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: stateRef.current?.token ?? store.get(KEY), after: lastId(), page: window.location.pathname, ...body }),
        });
        const data = await res.json();
        if (data.token) merge(data);
        if (!res.ok) setError(data.error ?? "Something went wrong. Please try again.");
        return res.ok;
      } catch {
        setError("Can't reach the server. Check your connection and try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [merge],
  );

  // Restore an earlier conversation (or one linked from an email: ?chat=TOKEN).
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("chat");
    if (fromLink) store.set(KEY, fromLink);
    const token = fromLink ?? store.get(KEY);
    if (token) {
      fetch(`/api/chat?token=${encodeURIComponent(token)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.token) {
            setState(d);
            if (fromLink) setOpen(true);
          }
        })
        .catch(() => {});
    }
    if (!token && !store.get(TEASER_KEY)) {
      const t = window.setTimeout(() => setShowTeaser(true), 12000);
      return () => window.clearTimeout(t);
    }
  }, []);

  // Poll for team replies: often while a person is involved, rarely otherwise.
  useEffect(() => {
    if (!state?.token) return;
    const live = state.status === "waiting" || state.status === "live";
    if (!live && !open) return;
    const ms = live ? (open ? 3000 : 15000) : 12000;
    const t = window.setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/chat?token=${encodeURIComponent(state.token)}&after=${lastId()}`);
        if (r.ok) merge(await r.json());
      } catch {
        /* try again next tick */
      }
    }, ms);
    return () => window.clearInterval(t);
  }, [state?.token, state?.status, open, merge]);

  const openChat = () => {
    setOpen(true);
    setUnread(0);
    setShowTeaser(false);
    store.set(TEASER_KEY, "1");
    if (!stateRef.current) void send({});
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [state?.messages.length, busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    // Show the visitor's message straight away.
    setState((s) => (s ? { ...s, messages: [...s.messages, { id: -Date.now(), role: "visitor", body: t, meta: null, at: new Date().toISOString() }] } : s));
    const ok = await send(t === "Talk to a person" ? { handoff: true } : { text: t });
    setState((s) => (s ? { ...s, messages: s.messages.filter((m) => m.id > 0 || !ok) } : s));
  };

  const msgs = state?.messages ?? [];
  const lastBot = [...msgs].reverse().find((m) => m.role === "bot" || m.role === "agent");
  const agentName = [...msgs].reverse().find((m) => m.role === "agent")?.meta?.agentName;
  const status = state?.status ?? "bot";
  const showContactForm = !!lastBot?.meta?.askContact && !state?.hasContact && lastBot.id === msgs.filter((m) => m.role !== "system").at(-1)?.id;

  return (
    <>
      {/* Launcher */}
      <div className={`fixed right-4 bottom-4 z-[70] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6 ${open ? "max-sm:hidden" : ""}`}>
        {showTeaser && !open && (
          <div className="relative max-w-[260px] border border-hair bg-white p-4 pr-9 text-sm shadow-[0_12px_32px_rgba(17,20,23,0.18)]">
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                setShowTeaser(false);
                store.set(TEASER_KEY, "1");
              }}
              className="absolute top-2 right-2 grid h-6 w-6 place-items-center text-subtle hover:text-ink"
            >
              ×
            </button>
            <button type="button" className="text-left" onClick={openChat}>
              {teaser}
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openChat())}
          aria-expanded={open}
          aria-controls="tb-chat"
          className="group relative flex h-14 items-center gap-3 bg-ink px-5 font-semibold text-white shadow-[0_12px_32px_rgba(17,20,23,0.28)] transition-colors hover:bg-charcoal"
        >
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-accent" />
          <ChatIcon />
          <span className="hidden sm:inline">{open ? "Close chat" : "Ask us anything"}</span>
          <span className="sr-only sm:hidden">{open ? "Close chat" : "Open chat"}</span>
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 grid h-6 min-w-6 place-items-center bg-accent px-1.5 text-xs font-bold text-white">{unread}</span>
          )}
        </button>
      </div>

      {/* Panel */}
      {open && (
        <section
          id="tb-chat"
          role="dialog"
          aria-label={`Chat with ${companyName}`}
          className="fixed inset-0 z-[80] flex flex-col bg-white sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[min(640px,calc(100vh-8rem))] sm:w-[400px] sm:border sm:border-hair sm:shadow-[0_24px_60px_rgba(17,20,23,0.28)]"
        >
          <header className="relative flex items-center gap-3 bg-deep px-5 py-4 text-white">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-accent" />
            <Image src="/logo-light.png" alt="" width={658} height={255} className="h-8 w-auto" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{status === "live" && agentName ? `${agentName} from ${companyName}` : `${companyName} assistant`}</p>
              <p className="flex items-center gap-1.5 text-xs text-fog">
                <span className={`h-2 w-2 ${status === "live" ? "bg-emerald-400" : status === "waiting" ? "bg-amber-400" : "bg-accent"}`} />
                {status === "live" ? "Team member online" : status === "waiting" ? "Connecting you to the team…" : ai ? "AI assistant · team on standby" : "Virtual assistant · team on standby"}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-9 w-9 place-items-center text-2xl leading-none text-fog hover:text-white">
              ×
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-mist px-4 py-5" aria-live="polite">
            {msgs.map((m) => {
              if (m.role === "system")
                return (
                  <p key={m.id} className="text-center text-xs text-subtle">
                    {m.body}
                  </p>
                );
              const mine = m.role === "visitor";
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  {m.role === "agent" && <span className="mb-1 text-xs font-semibold text-accent-ink">{m.meta?.agentName ?? "Team"}</span>}
                  <div
                    className={`max-w-[85%] px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                      mine ? "bg-ink text-white" : m.role === "agent" ? "border-l-[3px] border-accent bg-white" : "border border-hair bg-white"
                    }`}
                  >
                    <Text text={m.body} />
                  </div>
                  {m.meta?.cards && (
                    <div className="mt-2 w-full max-w-[85%] space-y-2">
                      {m.meta.cards.map((c) => (
                        <Link key={c.href} href={c.href} className="group block border border-hair bg-white p-3 hover:border-ink">
                          <span className="block text-[11px] font-semibold tracking-[0.1em] text-subtle uppercase">
                            {c.kind === "service" ? "Service" : c.kind === "case" ? "Case study" : "Page"}
                          </span>
                          <span className="mt-0.5 block font-semibold group-hover:text-accent-ink">{c.title} →</span>
                          {c.text && <span className="mt-1 block text-sm text-muted">{c.text}</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                  {m.meta?.quickReplies && m.id === lastBot?.id && status === "bot" && (
                    <div className="mt-2 flex max-w-[95%] flex-wrap gap-2">
                      {m.meta.quickReplies.map((q) => (
                        <button
                          key={q}
                          type="button"
                          disabled={busy}
                          onClick={() => submit(q)}
                          className="border border-ink bg-white px-3 py-1.5 text-sm font-semibold hover:bg-ink hover:text-white disabled:opacity-50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {showContactForm && (
              <form
                className="space-y-2 border border-hair bg-white p-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await send({ contact })) setContact({ name: "", email: "", phone: "" });
                }}
              >
                <p className="text-sm font-semibold">How can our team reach you?</p>
                {(["name", "email", "phone"] as const).map((f) => (
                  <input
                    key={f}
                    type={f === "email" ? "email" : f === "phone" ? "tel" : "text"}
                    autoComplete={f === "phone" ? "tel" : f}
                    placeholder={f === "name" ? "Your name" : f === "email" ? "Email" : "Phone (optional if email given)"}
                    value={contact[f]}
                    required={f === "name"}
                    onChange={(e) => setContact((c) => ({ ...c, [f]: e.target.value }))}
                    className="w-full border border-line px-3 py-2 text-base sm:text-[15px] focus:border-ink focus:outline-none"
                  />
                ))}
                <button type="submit" disabled={busy} className="w-full bg-accent px-3 py-2.5 font-semibold text-white hover:bg-accent-ink disabled:opacity-50">
                  Send to the team
                </button>
              </form>
            )}

            {busy && (
              <div className="flex items-center gap-1 px-1 py-2" aria-label="Typing">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce bg-subtle" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
            {error && <p className="border-l-[3px] border-accent-ink bg-accent-wash px-3 py-2 text-sm text-accent-ink">{error}</p>}
          </div>

          <form
            className="border-t border-hair bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(input);
            }}
          >
            <div className="flex items-end gap-2">
              <label htmlFor="tb-chat-input" className="sr-only">
                Message
              </label>
              <textarea
                id="tb-chat-input"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={1500}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submit(input);
                  }
                }}
                placeholder={status === "live" ? "Write a reply…" : "Type your question…"}
                className="max-h-32 min-h-11 flex-1 resize-none border border-line px-3 py-2.5 text-base sm:text-[15px] focus:border-ink focus:outline-none"
              />
              <button type="submit" disabled={busy || !input.trim()} className="h-11 bg-ink px-4 font-semibold text-white hover:bg-charcoal disabled:opacity-40">
                Send
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-subtle">
              {status === "bot" ? (
                <button type="button" disabled={busy} onClick={() => submit("Talk to a person")} className="shrink-0 font-semibold whitespace-nowrap text-ink underline-offset-2 hover:underline">
                  Talk to a person
                </button>
              ) : (
                <span>{status === "live" ? "You're chatting with our team" : "A team member will join shortly"}</span>
              )}
              {ai && <span className="text-right">AI can make mistakes</span>}
            </div>
          </form>
        </section>
      )}
    </>
  );
}
