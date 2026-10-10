"use client";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  is_alert: boolean;
  created_at: string;
};

export default function TeamChat({ isAdmin = false }: { isAdmin?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [isAlert, setIsAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = async (initial: boolean) => {
      const latest = messagesRef.current.at(-1)?.created_at;
      const query = new URLSearchParams();
      if (latest) query.set("since", latest);
      const response = await fetch(`/api/messages?${query.toString()}`);
      const result = await response.json();
      if (!active) return;
      if (!response.ok) {
        setError(result.error ?? "Could not load team messages.");
      } else {
        setMessages(current => {
          const incoming = result.data as Message[];
          const merged = initial ? incoming : [...current, ...incoming];
          return [...new Map(merged.map(message => [message.id, message])).values()].slice(-200);
        });
        setError("");
      }
      if (initial) setLoading(false);
    };
    const messagesRefCurrent = messagesRef;
    void load(true);
    const timer = window.setInterval(() => void load(false), 6000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text, is_alert: isAlert }),
    });
    const result = await response.json();
    setSending(false);
    if (!response.ok) { setError(result.error ?? "Could not send message."); return; }
    setMessages(current => [...current, result.data].slice(-200));
    setBody("");
    setIsAlert(false);
  };

  return (
    <section className="flex min-h-[min(70vh,680px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-primary-900 px-4 py-4 text-white sm:px-5">
        <div>
          <h1 className="text-lg font-bold">Team Chat</h1>
          <p className="mt-0.5 text-xs text-white/70">Private channel for management and staff</p>
        </div>
        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-100">Internal</span>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-5" aria-live="polite">
        {loading && <p className="py-8 text-center text-sm text-slate-500">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-3xl" aria-hidden>💬</p>
            <p className="mt-3 font-semibold text-slate-800">Start the team conversation</p>
            <p className="mt-1 text-sm text-slate-500">Messages are visible to signed-in admins and employees.</p>
          </div>
        )}
        {messages.map(message => (
          <article key={message.id} className={`max-w-[88%] rounded-lg border px-3.5 py-3 sm:max-w-[75%] ${
            message.is_alert ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
          }`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-xs font-bold text-primary-dark">{message.sender_name}{message.is_alert ? " · Alert" : ""}</p>
              <time className="text-[11px] text-slate-400">{new Date(message.created_at).toLocaleString()}</time>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{message.body}</p>
          </article>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="space-y-2 border-t border-slate-200 bg-white p-3 sm:p-4">
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="team-message">Message the team</label>
          <textarea id="team-message" className="input min-h-11 max-h-32 resize-y !rounded-lg !text-sm"
            rows={1} maxLength={2000} value={body} onChange={event => setBody(event.target.value)}
            placeholder="Write a message…" />
          <button type="submit" disabled={sending || !body.trim()} className="btn-primary !min-h-11 !rounded-lg !px-4">
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        {isAdmin && (
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={isAlert} onChange={event => setIsAlert(event.target.checked)} />
            Mark as team alert
          </label>
        )}
      </form>
    </section>
  );
}