"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fmt } from "@/lib/currency";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PIE_COLORS = ["#0F4C81", "#F5B301", "#16A34A", "#DC2626", "#7CAAD5", "#4D8BC2", "#D99E00", "#A9C9E4", "#2A6DA8", "#FFC93C", "#072742", "#0D4370"];

// date-only strings ("2026-01-01") parse as UTC midnight; extracting from the
// string keeps the year/month stable in every timezone
const yearOf = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? Number(d.slice(0, 4)) : null);
const monthOf = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? Number(d.slice(5, 7)) - 1 : null);

type Tx = { date: string | null; amount: number; tenant_name: string | null };
type Exp = { date: string | null; category: string; amount: number };
type LP = { date: string | null; amount: number };

export default function ReportsPage() {
  const [tx, setTx] = useState<Tx[]>([]);
  const [exp, setExp] = useState<Exp[]>([]);
  const [lp, setLp] = useState<LP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => { (async () => {
    const [t, e, l] = await Promise.all([
      supabase.from("transactions").select("date,amount,tenant_name").order("date").limit(3000),
      supabase.from("expenses").select("date,category,amount").order("date").limit(2000),
      supabase.from("landlord_payments").select("date,amount").order("date").limit(2000),
    ]);
    if (t.error || e.error || l.error) {
      setError(t.error?.message ?? e.error?.message ?? l.error?.message ?? "Failed to load data");
    } else {
      setTx((t.data ?? []) as Tx[]);
      setExp((e.data ?? []) as Exp[]);
      setLp((l.data ?? []) as LP[]);
      const years = [...new Set((t.data ?? []).map((r: Tx) => yearOf(r.date) ?? 0))].filter(Boolean) as number[];
      if (years.length) setYear(Math.max(...years));
    }
    setLoading(false);
  })(); }, []);

  const inYear = <T extends { date: string | null }>(rows: T[], y: number) =>
    rows.filter((r) => r.date && yearOf(r.date) === y);

  const collectedY = useMemo(() => inYear(tx, year).reduce((s, r) => s + Number(r.amount), 0), [tx, year]);
  const expensesY = useMemo(() => inYear(exp, year).reduce((s, r) => s + Number(r.amount), 0), [exp, year]);
  const landlordY = useMemo(() => inYear(lp, year).reduce((s, r) => s + Number(r.amount), 0), [lp, year]);

  const monthly = useMemo(() =>
    MONTHS.map((m, i) => {
      const inMonth = <T extends { date: string | null }>(rows: T[]) =>
        inYear(rows, year).filter((r) => monthOf(r.date) === i);
      return {
        month: m,
        Collected: inMonth(tx).reduce((s, r) => s + Number(r.amount), 0),
        Expenses: inMonth(exp).reduce((s, r) => s + Number(r.amount), 0),
      };
    }), [tx, exp, year]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of inYear(exp, year)) map.set(r.category, (map.get(r.category) ?? 0) + Number(r.amount));
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [exp, year]);

  const topTenants = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of inYear(tx, year)) {
      const name = r.tenant_name || "Unknown";
      map.set(name, (map.get(name) ?? 0) + Number(r.amount));
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [tx, year]);

  const yearly = useMemo(() => {
    const years = new Set<number>([
      ...tx.map((r) => (yearOf(r.date) ?? 0)),
      ...exp.map((r) => (yearOf(r.date) ?? 0)),
      ...lp.map((r) => (yearOf(r.date) ?? 0)),
    ]);
    return [...years].filter(Boolean).sort((a, b) => b - a).map((y) => {
      const c = inYear(tx, y).reduce((s, r) => s + Number(r.amount), 0);
      const e = inYear(exp, y).reduce((s, r) => s + Number(r.amount), 0);
      const l = inYear(lp, y).reduce((s, r) => s + Number(r.amount), 0);
      return { year: y, collected: c, expenses: e, landlord: l, net: c - e - l };
    });
  }, [tx, exp, lp]);

  const years = useMemo(() =>
    [...new Set(tx.map((r) => (yearOf(r.date) ?? 0)))].filter(Boolean).sort((a, b) => b - a) as number[],
  [tx]);

  if (loading) return <p className="py-16 text-center text-sm text-slate-500">Loading reports…</p>;
  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>
  );

  const kpis = [
    { label: "Rent collected", value: fmt(collectedY), cls: "text-success" },
    { label: "Expenses", value: fmt(expensesY), cls: "text-danger" },
    { label: "Paid to landlord", value: fmt(landlordY), cls: "text-primary" },
    { label: "Net profit", value: fmt(collectedY - expensesY - landlordY), cls: collectedY - expensesY - landlordY >= 0 ? "text-success" : "text-danger" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">📈 Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Financial analytics computed live from transactions, expenses and landlord payments</p>
        </div>
        <select className="input sm:max-w-[9rem]" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Report year">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card card-hover">
            <p className="text-sm font-medium text-slate-500">{k.label} · {year}</p>
            <p className={`mt-2 text-2xl font-bold ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6">
        <p className="section-title">Monthly cash flow — {year}</p>
        <p className="mt-1 text-xs text-slate-400">Collected rent vs operating expenses per month (AED)</p>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Collected" fill="#0F4C81" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <p className="section-title">Expenses by category — {year}</p>
          {byCategory.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No expenses recorded in {year}.</p>
          ) : (
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <p className="section-title">Top tenants by revenue — {year}</p>
          {topTenants.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No transactions recorded in {year}.</p>
          ) : (
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topTenants} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94A3B8" tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Bar dataKey="value" name="Paid" fill="#F5B301" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-6 !p-0 overflow-hidden">
        <p className="section-title px-5 pt-5">Year-by-year summary</p>
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[560px]">
            <thead>
              <tr>
                <th>Year</th><th>Rent collected</th><th>Expenses</th><th>Landlord</th><th>Net profit</th>
              </tr>
            </thead>
            <tbody>
              {yearly.map((y) => (
                <tr key={y.year} className={y.year === year ? "bg-primary-50/60 font-semibold" : ""}>
                  <td>{y.year}</td>
                  <td>{fmt(y.collected)}</td>
                  <td>{fmt(y.expenses)}</td>
                  <td>{fmt(y.landlord)}</td>
                  <td className={y.net >= 0 ? "text-success" : "text-danger"}>{fmt(y.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
