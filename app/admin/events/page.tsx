"use client";
import { useEffect, useState } from "react";

const TYPES = ["news", "event", "reminder", "notice"];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", event_date: "", type: "news", active: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/events").then(r => r.json()).then(({ data }) => {
      setEvents(data ?? []);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setMsg("Title is required"); return; }
    setBusy(true); setMsg("");
    await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    setShowForm(false);
    setForm({ title: "", body: "", event_date: "", type: "news", active: true });
    setMsg("✅ Posted successfully.");
    load();
  };

  const toggle = async (id: number, active: boolean) => {
    await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this post?")) return;
    await fetch("/api/admin/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const typeColor = (t: string) =>
    t === "reminder" ? "bg-amber-100 text-amber-700" :
    t === "event" ? "bg-blue-100 text-blue-700" :
    t === "notice" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">📅 News, Events & Reminders</h1>
          <p className="mt-1 text-sm text-slate-500">Post news, events, reminders and notices visible to all tenants.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Post</button>
      </div>

      {msg && <p className={`mt-3 text-sm font-medium ${msg.startsWith("✅") ? "text-green-700" : "text-danger"}`}>{msg}</p>}

      <div className="mt-4 space-y-3">
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {!loading && events.length === 0 && <div className="card py-10 text-center text-sm text-slate-500">No posts yet.</div>}
        {events.map(ev => (
          <div key={ev.id} className={`card ${!ev.active ? "opacity-50" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeColor(ev.type)}`}>{ev.type}</span>
                {ev.event_date && <span className="text-xs text-slate-400">{ev.event_date?.slice(0, 10)}</span>}
                {!ev.active && <span className="text-xs text-slate-400">(hidden)</span>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => toggle(ev.id, !ev.active)} className="text-xs font-semibold text-primary hover:underline">
                  {ev.active ? "Hide" : "Show"}
                </button>
                <button onClick={() => remove(ev.id)} className="text-xs font-semibold text-danger hover:underline">Delete</button>
              </div>
            </div>
            <h3 className="mt-2 font-semibold text-slate-800">{ev.title}</h3>
            {ev.body && <p className="mt-1 text-sm text-slate-600">{ev.body}</p>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift">
            <h3 className="text-lg font-bold text-primary-dark mb-4">New Post</h3>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Date (optional)</label>
                  <input className="input" type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Title *</label>
                <input className="input" type="text" placeholder="e.g. Water shutdown on Friday" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea className="input min-h-[80px]" placeholder="Details…" value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input type="checkbox" className="h-4 w-4" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                Visible to tenants immediately
              </label>
              {msg && <p className="text-sm text-danger">{msg}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={busy}>{busy ? "Posting…" : "Post"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
