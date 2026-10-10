"use client";
import { useState } from "react";

type Turn = { id: number; question: string; answer: string };

export default function TenantHelpChat() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ask = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: text }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error ?? "Could not get an answer."); return; }
    setTurns(current => [...current, { id: Date.now(), question: text, answer: result.answer ?? "Please contact the property manager for help." }]);
    setQuestion("");
  };

  return (
    <aside className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6" aria-label="Tenant help assistant">
      {open && (
        <section className="mb-3 flex h-[min(70vh,520px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift">
          <header className="flex items-center justify-between bg-primary-900 px-4 py-3 text-white">
            <div>
              <h2 className="font-semibold">Yazkap Help</h2>
              <p className="text-xs text-white/70">Quick answers for residents</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-2 text-white/80 hover:bg-white/10" aria-label="Close help chat">×</button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3" aria-live="polite">
            {turns.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">Ask about rent, payments, building rules, maintenance, or who to contact.</p>}
            {turns.map(turn => (
              <div key={turn.id} className="space-y-2 text-sm">
                <p className="ml-auto max-w-[90%] rounded-lg bg-primary-100 p-3 text-primary-900">{turn.question}</p>
                <p className="max-w-[95%] whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-slate-700">{turn.answer}</p>
              </div>
            ))}
            {busy && <p className="text-xs text-slate-500">Finding an answer…</p>}
            {error && <p className="text-xs text-danger" role="alert">{error}</p>}
          </div>
          <form onSubmit={ask} className="flex gap-2 border-t border-slate-200 p-3">
            <label className="sr-only" htmlFor="tenant-help-question">Ask a question</label>
            <input id="tenant-help-question" className="input !min-h-10 !rounded-lg !py-2 !text-sm" value={question}
              onChange={event => setQuestion(event.target.value)} maxLength={500} placeholder="Type your question…" />
            <button className="btn-primary !min-h-10 !rounded-lg !px-3" type="submit" disabled={busy || !question.trim()} aria-label="Send question">Send</button>
          </form>
        </section>
      )}
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}
        className="ml-auto flex min-h-12 items-center gap-2 rounded-full border border-primary-900 bg-primary-900 px-5 text-sm font-semibold text-white shadow-lift transition hover:bg-primary-dark">
        <span aria-hidden>💬</span>{open ? "Close help" : "Ask Yazkap"}
      </button>
    </aside>
  );
}