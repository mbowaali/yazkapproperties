"use client";
import { useEffect, useMemo, useState } from "react";
import { fmt } from "@/lib/currency";
import { exportToExcel } from "@/lib/excel";

type Row = {
  id: number; collection_month: string; coin_count: number;
  total_amount: number; collected_by: string | null; notes: string | null;
};

const COIN_VALUE = 3;

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchRows(): Promise<Row[]> {
  const res = await fetch("/api/admin/laundry-collections");
  const json = await res.json();
  return json.data ?? [];
}

export default function LaundryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ month: currentMonth(), coin_count: 0, collected_by: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));

  const load = () => { setLoading(true); fetchRows().then(d => { setRows(d); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const years = useMemo(() => {
    const ys = new Set<string>([String(new Date().getFullYear())]);
    rows.forEach(r => { if (r.collection_month) ys.add(r.collection_month.slice(0, 4)); });
    return [...ys].sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter(r => filterYear === "all" || r.collection_month?.slice(0, 4) === filterYear);
  }, [rows, filterYear]);

  const stats = useMemo(() => {
    const coins = visible.reduce((sum, row) => sum + Number(row.coin_count ?? 0), 0);
    const amount = visible.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
    return { coins, amount };
  }, [visible]);

  const openAdd = () => {
    setForm({ month: currentMonth(), coin_count: 0, collected_by: "", notes: "" });
    setFormErr("");
    setShowForm(true);
  };

  const openEdit = (r: Row) => {
    setForm({
      month: r.collection_month.slice(0, 7), coin_count: Number(r.coin_count),
      collected_by: r.collected_by ?? "", notes: r.notes ?? "",
    });
    setFormErr("");
    setShowForm(true);
  };

  const save = async () => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.month)) { setFormErr("Choose a valid month"); return; }
    if (!Number.isInteger(form.coin_count) || form.coin_count < 0) { setFormErr("Enter a whole-number coin count of zero or more"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/laundry-collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setFormErr(json.error ?? "Could not save monthly collection"); return; }
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">🫧 Washing Machine Collections</h1>
          <p className="mt-1 text-sm text-slate-500">One coin runs the shared machine for two hours and costs AED 3. Record the total coins collected each month.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToExcel(visible.map(r => ({
            Month: r.collection_month.slice(0, 7), Coins: r.coin_count,
            "Total collected (AED)": r.total_amount, "Collected by": r.collected_by ?? "", Notes: r.notes ?? "",
          })), "laundry-monthly-collections")} className="btn-ghost" disabled={!visible.length}>⬇ Export</button>
          <button onClick={openAdd} className="btn-primary">+ Record Month</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Coins Counted", value: stats.coins.toLocaleString(), cls: "text-primary", icon: "🪙" },
          { label: "Total Collected", value: fmt(stats.amount), cls: "text-success", icon: "💰" },
          { label: "Months Recorded", value: String(visible.length), cls: "text-slate-700", icon: "📅" },
        ].map(c => (
          <div key={c.label} className="card card-hover">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>{c.icon}</span>
              <p className="text-xs font-medium text-slate-500">{c.label}</p>
            </div>
            <p className={`mt-2 text-xl font-bold ${c.cls}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mt-4 !p-0 overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <select className="input sm:max-w-[8rem]" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="all">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <p className="text-sm text-slate-400 sm:ml-auto self-center">{visible.length} monthly records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="table-clean min-w-[640px]">
            <thead>
              <tr><th>Month</th><th>Coins</th><th>Total collected</th><th>Collected by</th><th>Notes</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">Loading…</td></tr>}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No monthly counts recorded.</td></tr>
              )}
              {visible.map(r => (
                <tr key={r.id}>
                  <td>{r.collection_month?.slice(0, 7)}</td>
                  <td>{Number(r.coin_count).toLocaleString()}</td>
                  <td className="font-semibold text-success">{fmt(r.total_amount)}</td>
                  <td>{r.collected_by || "—"}</td>
                  <td className="max-w-xs truncate" title={r.notes ?? ""}>{r.notes || "—"}</td>
                  <td className="whitespace-nowrap text-right">
                    <button onClick={() => openEdit(r)} className="text-sm font-semibold text-primary hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift">
            <h2 className="text-lg font-bold text-primary-dark">Record Monthly Coin Count</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Month *</label>
                <input className="input" type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} required />
              </div>
              <div>
                <label className="label">Coins collected *</label>
                <input className="input" type="number" min="0" step="1" value={form.coin_count}
                  onChange={e => setForm({ ...form, coin_count: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="label">Collected by</label>
                <input className="input" value={form.collected_by} onChange={e => setForm({ ...form, collected_by: e.target.value })} placeholder="Key holder's name" />
              </div>
              <div>
                <label className="label">Total collected</label>
                <p className="input bg-slate-50 font-semibold">{fmt(form.coin_count * COIN_VALUE)} <span className="font-normal text-slate-500">({form.coin_count} × AED 3)</span></p>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notes</label>
                <textarea className="input min-h-[60px]" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            {formErr && <p className="mt-3 text-sm font-medium text-danger">{formErr}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Monthly Count"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
