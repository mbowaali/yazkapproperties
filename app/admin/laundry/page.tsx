"use client";
import { useEffect, useMemo, useState } from "react";
import { fmt } from "@/lib/currency";
import { exportToExcel } from "@/lib/excel";

type Row = {
  id: number; machine_id: string; machine_label: string | null;
  used_by_name: string | null; unit_label: string | null;
  date: string; cycles: number; fee_per_cycle: number;
  total_fee: number; currency: string; paid: boolean; notes: string | null;
};

const MACHINES = ["WM-01", "WM-02", "WM-03", "WM-04"];
const EMPTY_FORM = {
  machine_id: "WM-01", machine_label: "", used_by_name: "", unit_label: "",
  date: new Date().toISOString().slice(0, 10), cycles: 1,
  fee_per_cycle: 5, currency: "AED", paid: false, notes: "",
};

async function fetchRows(): Promise<Row[]> {
  const res = await fetch("/api/db?table=laundry_usage&orderBy=date&limit=5000");
  const json = await res.json();
  return json.data ?? [];
}

export default function LaundryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterMachine, setFilterMachine] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = () => { setLoading(true); fetchRows().then(d => { setRows(d); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const years = useMemo(() => {
    const ys = new Set<string>([String(new Date().getFullYear())]);
    rows.forEach(r => { if (r.date) ys.add(r.date.slice(0, 4)); });
    return [...ys].sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const visible = useMemo(() => {
    return rows.filter(r => {
      if (filterYear !== "all" && !r.date?.startsWith(filterYear)) return false;
      if (filterMonth !== "all" && r.date?.slice(5, 7) !== filterMonth.padStart(2, "0")) return false;
      if (filterMachine !== "all" && r.machine_id !== filterMachine) return false;
      if (search) {
        const q = search.toLowerCase();
        return (r.used_by_name ?? "").toLowerCase().includes(q) ||
          (r.unit_label ?? "").toLowerCase().includes(q) ||
          r.machine_id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [rows, filterYear, filterMonth, filterMachine, search]);

  const stats = useMemo(() => {
    const totalFees = visible.reduce((s, r) => s + Number(r.total_fee ?? 0), 0);
    const totalCycles = visible.reduce((s, r) => s + Number(r.cycles ?? 0), 0);
    const collected = visible.filter(r => r.paid).reduce((s, r) => s + Number(r.total_fee ?? 0), 0);
    const outstanding = totalFees - collected;
    const byMachine: Record<string, { cycles: number; fees: number }> = {};
    visible.forEach(r => {
      if (!byMachine[r.machine_id]) byMachine[r.machine_id] = { cycles: 0, fees: 0 };
      byMachine[r.machine_id].cycles += Number(r.cycles ?? 0);
      byMachine[r.machine_id].fees += Number(r.total_fee ?? 0);
    });
    return { totalFees, totalCycles, collected, outstanding, byMachine };
  }, [visible]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setFormErr("");
    setShowForm(true);
  };

  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({
      machine_id: r.machine_id, machine_label: r.machine_label ?? "",
      used_by_name: r.used_by_name ?? "", unit_label: r.unit_label ?? "",
      date: r.date?.slice(0, 10) ?? "", cycles: r.cycles,
      fee_per_cycle: r.fee_per_cycle, currency: r.currency,
      paid: r.paid, notes: r.notes ?? "",
    });
    setFormErr("");
    setShowForm(true);
  };

  const save = async () => {
    if (!form.used_by_name.trim()) { setFormErr("Tenant name is required"); return; }
    if (!form.date) { setFormErr("Date is required"); return; }
    setSaving(true);
    const payload = {
      machine_id: form.machine_id,
      machine_label: form.machine_label || form.machine_id,
      used_by_name: form.used_by_name,
      unit_label: form.unit_label || null,
      date: form.date,
      cycles: Number(form.cycles) || 1,
      fee_per_cycle: Number(form.fee_per_cycle) || 5,
      currency: form.currency,
      paid: form.paid,
      notes: form.notes || null,
    };
    const res = await fetch("/api/db", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editId ? { table: "laundry_usage", id: editId, payload } : { table: "laundry_usage", payload }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.error) { setFormErr(json.error); return; }
    setShowForm(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this record?")) return;
    await fetch("/api/db", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "laundry_usage", id }),
    });
    load();
  };

  const togglePaid = async (r: Row) => {
    await fetch("/api/db", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "laundry_usage", id: r.id, payload: { paid: !r.paid } }),
    });
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">🫧 Laundry / Washing Machines</h1>
          <p className="mt-1 text-sm text-slate-500">Track machine usage, fees collected per tenant, weekly/monthly/yearly totals</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToExcel(visible.map(r => ({
            Date: r.date, Machine: r.machine_id, Tenant: r.used_by_name, Unit: r.unit_label,
            Cycles: r.cycles, "Fee/Cycle": r.fee_per_cycle, Total: r.total_fee, Paid: r.paid ? "Yes" : "No",
          })), "laundry-usage")} className="btn-ghost" disabled={!visible.length}>⬇ Export</button>
          <button onClick={openAdd} className="btn-primary">+ Add Usage</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Fees", value: fmt(stats.totalFees), cls: "text-primary", icon: "💰" },
          { label: "Collected", value: fmt(stats.collected), cls: "text-success", icon: "✅" },
          { label: "Outstanding", value: fmt(stats.outstanding), cls: stats.outstanding > 0 ? "text-danger" : "text-success", icon: "⏳" },
          { label: "Total Cycles", value: String(stats.totalCycles), cls: "text-slate-700", icon: "🔄" },
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

      {/* Per-machine breakdown */}
      {Object.keys(stats.byMachine).length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(stats.byMachine).map(([mid, s]) => (
            <div key={mid} className="card !p-3">
              <p className="text-xs font-semibold text-primary">{mid}</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{fmt(s.fees)}</p>
              <p className="text-xs text-slate-400">{s.cycles} cycle{s.cycles !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card mt-4 !p-0 overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <input type="search" placeholder="Search tenant / unit…" className="input sm:max-w-xs"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input sm:max-w-[8rem]" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="all">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input sm:max-w-[8rem]" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="all">All months</option>
            {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
          </select>
          <select className="input sm:max-w-[8rem]" value={filterMachine} onChange={e => setFilterMachine(e.target.value)}>
            <option value="all">All machines</option>
            {MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <p className="text-sm text-slate-400 sm:ml-auto self-center">{visible.length} records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="table-clean min-w-[700px]">
            <thead>
              <tr>
                <th>Date</th><th>Machine</th><th>Tenant</th><th>Unit</th>
                <th>Cycles</th><th>Fee/Cycle</th><th>Total</th><th>Paid</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-500">Loading…</td></tr>}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-500">No records yet — add the first usage.</td></tr>
              )}
              {visible.map(r => (
                <tr key={r.id}>
                  <td>{r.date?.slice(0, 10)}</td>
                  <td><span className="font-semibold text-primary">{r.machine_id}</span></td>
                  <td className="font-medium">{r.used_by_name || "—"}</td>
                  <td>{r.unit_label || "—"}</td>
                  <td>{r.cycles}</td>
                  <td>{fmt(r.fee_per_cycle)}</td>
                  <td className="font-semibold">{fmt(r.total_fee)}</td>
                  <td>
                    <button onClick={() => togglePaid(r)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer ${r.paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.paid ? "Paid" : "Unpaid"}
                    </button>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button onClick={() => openEdit(r)} className="text-sm font-semibold text-primary hover:underline">Edit</button>
                    <span className="mx-1.5 text-slate-200">|</span>
                    <button onClick={() => remove(r.id)} className="text-sm font-semibold text-danger hover:underline">Delete</button>
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
            <h2 className="text-lg font-bold text-primary-dark">{editId ? "Edit Usage" : "Add Machine Usage"}</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="label">Machine *</label>
                <select className="input" value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })}>
                  {MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="label">Tenant Name *</label>
                <input className="input" type="text" placeholder="Full name" value={form.used_by_name}
                  onChange={e => setForm({ ...form, used_by_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Unit</label>
                <input className="input" type="text" placeholder="e.g. Studio 2F-03" value={form.unit_label}
                  onChange={e => setForm({ ...form, unit_label: e.target.value })} />
              </div>
              <div>
                <label className="label">Cycles</label>
                <input className="input" type="number" min="1" value={form.cycles}
                  onChange={e => setForm({ ...form, cycles: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Fee per Cycle (AED)</label>
                <input className="input" type="number" step="0.5" min="0" value={form.fee_per_cycle}
                  onChange={e => setForm({ ...form, fee_per_cycle: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <p className="text-sm font-semibold text-primary">
                  Total: {fmt(Number(form.cycles) * Number(form.fee_per_cycle))}
                </p>
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
                  <input type="checkbox" className="h-5 w-5 rounded border-slate-300"
                    checked={form.paid} onChange={e => setForm({ ...form, paid: e.target.checked })} />
                  Mark as Paid
                </label>
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea className="input min-h-[60px]" placeholder="Optional notes…" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            {formErr && <p className="mt-3 text-sm font-medium text-danger">{formErr}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : editId ? "Save changes" : "Add Usage"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
