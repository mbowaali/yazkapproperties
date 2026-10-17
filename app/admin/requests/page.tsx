"use client";
import { useEffect, useState } from "react";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("in-progress");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/requests").then(r => r.json()).then(({ data }) => {
      setRequests(data ?? []);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const openReply = (r: any) => {
    setSelected(r);
    setReply(r.admin_reply ?? "");
    setStatus(r.status === "open" ? "in-progress" : r.status);
    setMsg("");
  };

  const save = async () => {
    setBusy(true);
    let res: Response;
    try {
      res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status, admin_reply: reply }),
      });
    } catch {
      setBusy(false);
      setMsg("❌ Network error. Please try again.");
      return;
    }
    let json: { error?: string };
    try {
      json = await res.json();
    } catch {
      setBusy(false);
      setMsg(`❌ Server error (${res.status}). Please try again.`);
      return;
    }
    setBusy(false);
    if (!res.ok) { setMsg("❌ " + (json.error ?? "Failed to send reply")); return; }
    setSelected(null);
    setMsg("✅ Reply sent.");
    load();
  };

  const open = requests.filter(r => r.status === "open").length;
  const statusColor = (s: string) =>
    s === "resolved" ? "bg-green-100 text-green-700" :
    s === "in-progress" ? "bg-blue-100 text-blue-700" :
    s === "closed" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700";

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary-dark">📬 Tenant Requests</h1>
      <p className="mt-1 text-sm text-slate-500">Maintenance, complaints and general requests from tenants.</p>
      {open > 0 && <div className="mt-3 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{open} open</div>}
      {msg && <p className="mt-3 text-sm font-medium text-green-700">{msg}</p>}

      <div className="card mt-4 !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[640px]">
            <thead><tr><th>Tenant</th><th>Unit</th><th>Type</th><th>Subject</th><th>Date</th><th>Status</th><th className="text-right">Action</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">Loading…</td></tr>}
              {!loading && requests.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No requests yet.</td></tr>}
              {requests.map(r => (
                <tr key={r.id}>
                  <td className="font-medium">{r.tenant_name_from_user || "—"}</td>
                  <td>{r.unit_label || "—"}</td>
                  <td className="capitalize">{r.type}</td>
                  <td className="max-w-[180px] truncate">{r.subject}</td>
                  <td>{r.created_at?.slice(0, 10)}</td>
                  <td><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(r.status)}`}>{r.status}</span></td>
                  <td className="text-right">
                    <button onClick={() => openReply(r)} className="text-sm font-semibold text-primary hover:underline">Reply</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift">
            <h3 className="text-lg font-bold text-primary-dark">{selected.subject}</h3>
            <p className="mt-1 text-xs text-slate-400 capitalize">{selected.type} · {selected.created_at?.slice(0, 10)}</p>
            {selected.message && <p className="mt-3 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{selected.message}</p>}
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Update Status</label>
                <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                  {["open","in-progress","resolved","closed"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Reply to Tenant</label>
                <textarea className="input min-h-[80px]" placeholder="Your reply…" value={reply} onChange={e => setReply(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setSelected(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={save} className="btn-primary flex-1" disabled={busy}>{busy ? "Saving…" : "Send Reply"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
