"use client";
import { useEffect, useState } from "react";

type FAQ = { id: number; question: string; answer: string; keywords: string | null; active: boolean; sort_order: number };
type FAQForm = { question: string; answer: string; keywords: string; active: boolean };
const EMPTY_FORM: FAQForm = { question: "", answer: "", keywords: "", active: true };

export default function ChatbotFAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [form, setForm] = useState<FAQForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/chatbot");
    const result = await response.json();
    setFaqs(result.data ?? []);
    if (!response.ok) setError(result.error ?? "Could not load chatbot answers.");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    let response: Response;
    try {
      response = await fetch("/api/admin/chatbot", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
    } catch {
      setSaving(false);
      setError("Network error. Please try again.");
      return;
    }
    let result: { error?: string };
    try {
      result = await response.json();
    } catch {
      setSaving(false);
      setError(`Server error (${response.status}). Please try again.`);
      return;
    }
    setSaving(false);
    if (!response.ok) { setError(result.error ?? "Could not save this answer."); return; }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMessage(editingId ? "Answer updated." : "Answer added.");
    await load();
  };

  const edit = (faq: FAQ) => {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, keywords: faq.keywords ?? "", active: faq.active });
    setMessage("");
  };

  const toggle = async (faq: FAQ) => {
    const response = await fetch("/api/admin/chatbot", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: faq.id, active: !faq.active }),
    });
    if (!response.ok) { setError("Could not update answer visibility."); return; }
    await load();
  };

  const remove = async (faq: FAQ) => {
    if (!window.confirm(`Delete this answer: “${faq.question}”?`)) return;
    const response = await fetch(`/api/admin/chatbot?id=${faq.id}`, { method: "DELETE" });
    if (!response.ok) { setError("Could not delete answer."); return; }
    await load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-primary-dark">Tenant Help Answers</h1>
        <p className="mt-1 text-sm text-slate-500">Maintain the answers shown by the tenant help assistant.</p>
      </header>
      {message && <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{message}</p>}
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

      <form onSubmit={submit} className="card space-y-4">
        <h2 className="font-semibold text-primary-dark">{editingId ? "Edit answer" : "Add an answer"}</h2>
        <div>
          <label className="label" htmlFor="faq-question">Question</label>
          <input id="faq-question" className="input" value={form.question} maxLength={500}
            onChange={event => setForm({ ...form, question: event.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="faq-answer">Answer</label>
          <textarea id="faq-answer" className="input min-h-28" value={form.answer} maxLength={4000}
            onChange={event => setForm({ ...form, answer: event.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="faq-keywords">Matching words</label>
          <input id="faq-keywords" className="input" value={form.keywords} maxLength={1000}
            onChange={event => setForm({ ...form, keywords: event.target.value })} placeholder="Separate related words with spaces" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />
          Available to tenants
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : editingId ? "Save answer" : "Add answer"}</button>
          {editingId && <button type="button" className="btn-ghost" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>Cancel edit</button>}
        </div>
      </form>

      <section className="divide-y divide-slate-200 border-y border-slate-200">
        <div className="py-3 text-xs font-semibold uppercase text-slate-500">Saved answers</div>
        {loading && <p className="py-8 text-center text-sm text-slate-500">Loading…</p>}
        {!loading && faqs.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No answers yet.</p>}
        {faqs.map(faq => (
          <article key={faq.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-800">{faq.question}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${faq.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {faq.active ? "Active" : "Hidden"}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{faq.answer}</p>
              {faq.keywords && <p className="mt-2 text-xs text-slate-400">Match terms: {faq.keywords}</p>}
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => edit(faq)}>Edit</button>
              <button type="button" className="font-semibold text-slate-600 hover:underline" onClick={() => toggle(faq)}>{faq.active ? "Hide" : "Show"}</button>
              <button type="button" className="font-semibold text-danger hover:underline" onClick={() => remove(faq)}>Delete</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}