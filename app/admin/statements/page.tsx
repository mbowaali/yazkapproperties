"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fmt } from "@/lib/currency";
import { exportToExcel } from "@/lib/excel";
import { buildStatement, amountInWords, type Tenant, type Tx, type Deposit } from "@/lib/finance";
import SupabaseConfigNotice from "@/components/SupabaseConfigNotice";

export default function StatementsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tx, setTx] = useState<Tx[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => { (async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const [t, x, d] = await Promise.all([
      supabase.from("tenants").select("code,full_name,monthly_rent,entry_date,status").order("full_name").limit(2000),
      supabase.from("transactions").select("date,amount,tenant_name,method,status").limit(5000),
      supabase.from("deposits").select("tenant_name,amount,status,held_since").limit(2000),
    ]);
    if (t.error) { setError(t.error.message); setLoading(false); return; }
    setTenants((t.data ?? []) as Tenant[]);
    setTx((x.data ?? []) as Tx[]);
    setDeposits((d.data ?? []) as Deposit[]);
    setLoading(false);
  })(); }, []);

  const years = useMemo(() => {
    const ys = new Set<number>([new Date().getFullYear()]);
    tx.forEach((r) => { const y = Number((r.date ?? "").slice(0, 4)); if (y) ys.add(y); });
    return [...ys].sort((a, b) => b - a);
  }, [tx]);

  const tenant = tenants.find((t) => t.code === code) ?? tenants[0];
  const st = useMemo(
    () => (tenant ? buildStatement(tenant, year, tx, deposits, []) : null),
    [tenant, year, tx, deposits]
  );

  const exportStatement = () => {
    if (!st) return;
    exportToExcel(
      [
        ...st.monthly.map((m) => ({ Month: m.month, Expected: m.expected, Collected: m.collected, Variance: m.variance })),
        { Month: "TOTAL", Expected: st.expectedTotal, Collected: st.collectedTotal, Variance: st.balance },
      ],
      `statement-${st.tenant.code}-${st.year}`
    );
  };

  if (loading) return <p className="py-16 text-center text-sm text-slate-500">Loading statements…</p>;
  if (!isSupabaseConfigured) return <SupabaseConfigNotice />;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">📑 Tenant Statements</h1>
          <p className="mt-1 text-sm text-slate-500">Auto-calculated from the rent roll — expected vs collected, arrears, deposits. Print or save as PDF.</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <select className="input sm:max-w-[16rem]" value={tenant?.code ?? ""} onChange={(e) => setCode(e.target.value)} aria-label="Choose tenant">
            {tenants.map((t) => <option key={t.code} value={t.code}>{t.code} — {t.full_name}</option>)}
          </select>
          <select className="input sm:max-w-[8rem]" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-ghost" onClick={exportStatement} disabled={!st}>⬇ Excel</button>
          <button className="btn-primary" onClick={() => window.print()} disabled={!st}>🖨 Print / Save PDF</button>
        </div>
      </div>

      {!tenant || !st ? (
        <p className="card mt-6 py-10 text-center text-sm text-slate-500">No tenants on the roster yet.</p>
      ) : (
        <div className="print-area mt-6">
          {/* Statement head */}
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-lg font-bold text-primary-dark">Rental Payment Statement — {year}</p>
                <p className="mt-1 text-sm text-slate-500">Yazkap Properties · Valencia Laundry Building, 302 Electra Street, Abu Dhabi</p>
              </div>
              <div className="text-right text-sm">
                <p><span className="text-slate-400">Tenant:</span> <span className="font-semibold">{st.tenant.full_name}</span></p>
                <p><span className="text-slate-400">Code:</span> {st.tenant.code}</p>
                <p><span className="text-slate-400">Space:</span> {st.tenant.space_type || "—"}</p>
                <p><span className="text-slate-400">Entry:</span> {st.tenant.entry_date || "—"}</p>
              </div>
            </div>

            {/* KPI row */}
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Expected rent {year}</p>
                <p className="mt-1 text-xl font-bold text-slate-800">{fmt(st.expectedTotal)}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3">
                <p className="text-xs font-medium text-green-700">Collected {year}</p>
                <p className="mt-1 text-xl font-bold text-green-700">{fmt(st.collectedTotal)}</p>
              </div>
              <div className={`rounded-xl p-3 ${st.balance > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <p className={`text-xs font-medium ${st.balance > 0 ? "text-red-600" : "text-green-700"}`}>{st.balance > 0 ? "Arrears (owed)" : "Balance (credit)"}</p>
                <p className={`mt-1 text-xl font-bold ${st.balance > 0 ? "text-red-600" : "text-green-700"}`}>{fmt(Math.abs(st.balance))}</p>
              </div>
              <div className="rounded-xl bg-primary-50 p-3">
                <p className="text-xs font-medium text-primary">Deposit held</p>
                <p className="mt-1 text-xl font-bold text-primary-dark">{fmt(st.depositHeld)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Balance in words: <span className="font-semibold">{amountInWords(Math.abs(st.balance))}</span>
              {st.balance > 0 ? " (arrears)" : st.balance < 0 ? " (advance/credit)" : " — fully settled"}
            </p>
          </div>

          {/* Monthly table */}
          <div className="card mt-4 !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-clean min-w-[560px]">
                <thead>
                  <tr><th>Month</th><th>Expected</th><th>Collected</th><th>Variance</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {st.monthly.map((m) => (
                    <tr key={m.month}>
                      <td>{m.month}</td>
                      <td>{m.expected ? fmt(m.expected) : "—"}</td>
                      <td>{m.collected ? fmt(m.collected) : "—"}</td>
                      <td className={m.variance < 0 ? "text-danger" : "text-success"}>{m.expected ? fmt(m.variance) : "—"}</td>
                      <td>
                        {!m.expected ? <span className="text-slate-300">—</span>
                          : m.variance >= 0 ? <span className="pill-paid">Paid</span>
                          : <span className="pill-unpaid">Short {fmt(-m.variance)}</span>}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td>Total</td>
                    <td>{fmt(st.expectedTotal)}</td>
                    <td>{fmt(st.collectedTotal)}</td>
                    <td className={st.balance < 0 ? "text-danger" : "text-success"}>{fmt(st.balance)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments in the year */}
          <div className="card mt-4 !p-0 overflow-hidden">
            <p className="section-title px-5 pt-5">Payments recorded in {year} ({st.payments.length})</p>
            <div className="overflow-x-auto">
              <table className="table-clean min-w-[520px]">
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                <tbody>
                  {st.payments.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-sm text-slate-500">No payments recorded for {year}.</td></tr>
                  )}
                  {st.payments.map((p, i) => (
                    <tr key={i}>
                      <td>{p.date}</td>
                      <td className="font-semibold">{fmt(p.amount)}</td>
                      <td>{p.method || "—"}</td>
                      <td>{p.status || "Paid"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {st.deposits.length > 0 && (
            <div className="card mt-4 !p-0 overflow-hidden">
              <p className="section-title px-5 pt-5">Security deposits</p>
              <div className="overflow-x-auto">
                <table className="table-clean min-w-[420px]">
                  <thead><tr><th>Amount</th><th>Status</th><th>Held since</th></tr></thead>
                  <tbody>
                    {st.deposits.map((d, i) => (
                      <tr key={i}>
                        <td className="font-semibold">{fmt(d.amount)}</td>
                        <td><span className="pill-paid">{d.status}</span></td>
                        <td>{d.held_since || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400">
            Expected rent = contract monthly rent × months of occupancy in {year}. Arrears estimates for exited tenants may need manual review. Generated {new Date().toISOString().slice(0, 10)}.
          </p>
        </div>
      )}
    </div>
  );
}
