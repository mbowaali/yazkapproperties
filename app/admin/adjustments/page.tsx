"use client";
import { useEffect, useMemo, useState } from "react";
import { fmt } from "@/lib/currency";

type Tenant = { id: number; full_name: string; email: string; unit_label: string | null };
type Adjustment = {
  id: number; user_id: number; tenant_name: string; unit_label: string | null;
  adjustment_type: "refund" | "discount"; amount: number; currency: string;
  effective_date: string; reason: string; status: "pending" | "completed" | "cancelled";
};

const today = () => new Date().toISOString().slice(0, 10);

export default function AdjustmentsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rows, setRows] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ user_id: "", adjustment_type: "refund", amount: "", effective_date: today(), reason: "", status: "pending" });

  const load = async () => {
    setLoading(true);
    const [tenantResponse, adjustmentResponse] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/adjustments"),
    ]);
    const [tenantData, adjustmentData] = await Promise.all([tenantResponse.json(), adjustmentResponse.json()]);
    setTenants(tenantData.data ?? []);
    setRows(adjustmentData.data ?? []);
    setError(tenantResponse.ok && adjustmentResponse.ok ? "" : adjustmentData.error ?? tenantData.error ?? "Could not load adjustments.");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => ({
    pendingRefunds: rows.filter(row => row.adjustment_type === "refund" && row.status === "pending")
      .reduce((sum, row) => sum + Number(row.amount), 0),
    completedDiscounts: rows.filter(row => row.adjustment_type === "discount" && row.status === "completed")
      .reduce((sum, row) => sum + Number(row.amount), 0),
  }), [rows]);

  const openForm = () => {
    setForm({ user_id: "", adjustment_type: "refund", amount: "", effective_date: today(), reason: "", status: "pending" });
    setMessage("");
    setError("");
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error ?? "Could not save adjustment."); return; }
    setShowForm(false);
    setMessage("Adjustment recorded.");
    await load();
  };

  const changeStatus = async (id: number, status: Adjustment["status"]) => {
    setError("");
    const response = await fetch("/api/admin/adjustments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not update status."); return; }
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Refunds & Discounts</h1>
          <p className="mt-1 text-sm text-slate-500">Record one-time tenant refunds and rent discounts.</p>
        </div>
        <button onClick={openForm} className="btn-primary">Record Adjustment</button>
      </div>

      {message && <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{message}</p>}
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card"><p className="text-xs text-slate-500">Pending refunds</p><p className="mt-1 text-xl font-bold text-amber-700">{fmt(totals.pendingRefunds)}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Completed discounts</p><p className="mt-1 text-xl font-bold text-success">{fmt(totals.completedDiscounts)}</p></div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card space-y-4">
          <h2 className="font-semibold text-primary-dark">New adjustment</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="adjustment-tenant">Tenant</label>
              <select id="adjustment-tenant" className="input" value={form.user_id} onChange={event => setForm({ ...form, user_id: event.target.value })} required>
                <option value="">Select tenant</option>
                {tenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.full_name} · {tenant.unit_label || tenant.email}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="adjustment-type">Type</label>
              <select id="adjustment-type" className="input" value={form.adjustment_type} onChange={event => {
                const adjustment_type = event.target.value;
                setForm({ ...form, adjustment_type, status: adjustment_type === "refund" ? "pending" : "completed" });
              }}>
                <option value="refund">Refund</option>
                <option value="discount">Discount</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="adjustment-amount">Amount (AED)</label>
              <input id="adjustment-amount" className="input" type="number" min="0.01" step="0.01" value={form.amount}
                onChange={event => setForm({ ...form, amount: event.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="adjustment-date">Date</label>
              <input id="adjustment-date" className="input" type="date" value={form.effective_date}
                onChange={event => setForm({ ...form, effective_date: event.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="adjustment-status">Status</label>
              <select id="adjustment-status" className="input" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="adjustment-reason">Reason</label>
              <input id="adjustment-reason" className="input" value={form.reason}
                onChange={event => setForm({ ...form, reason: event.target.value })} maxLength={1000} required />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save Adjustment"}</button>
          </div>
        </form>
      )}

      <section className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[760px]">
            <thead><tr><th>Date</th><th>Tenant</th><th>Type</th><th>Amount</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No refunds or discounts recorded.</td></tr>}
              {rows.map(row => (
                <tr key={row.id}>
                  <td>{row.effective_date?.slice(0, 10)}</td>
                  <td>{row.tenant_name}{row.unit_label ? ` · ${row.unit_label}` : ""}</td>
                  <td className="capitalize">{row.adjustment_type}</td>
                  <td className="font-semibold">{fmt(row.amount)}</td>
                  <td>{row.reason}</td>
                  <td><select className="input !min-h-0 py-1 text-xs" value={row.status} aria-label={`Status for adjustment ${row.id}`}
                    onChange={event => changeStatus(row.id, event.target.value as Adjustment["status"])}>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}