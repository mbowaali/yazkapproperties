"use client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/currency";
import { calculateFinancialSummary } from "@/lib/finance";

async function q(table: string, select = "*") {
  const res = await fetch(`/api/db?table=${table}&select=${select}&limit=5000`);
  const json = await res.json();
  return (json.data ?? []) as any[];
}

export default function AdminOverview() {
  const [stats, setStats] = useState({ collected: 0, owed: 0, vacant: 0, occupied: 0, expenses: 0, landlordPaid: 0, openMaintenance: 0, laundryCollected: 0, refunds: 0, discounts: 0, netProfit: 0, netLoss: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const y = new Date().getFullYear();
      const [tr, inv, un, ex, lp, mt, lw, adjustmentResponse] = await Promise.all([
        q("transactions", "amount,date,type,status,tenant_name"),
        q("invoices", "total,status"),
        q("units", "status"),
        q("expenses", "amount,date"),
        q("landlord_payments", "amount,date"),
        q("maintenance_requests", "id,status"),
        q("laundry_collections", "total_amount,collection_month"),
        fetch("/api/admin/adjustments").then(response => response.json()),
      ]);
      const finance = calculateFinancialSummary(y, tr, ex, lp, lw, adjustmentResponse.data ?? []);
      const sum = (rows: any[], dateField?: string) =>
        rows
          .filter(r => !dateField || String(r[dateField] ?? "").startsWith(String(y)))
          .reduce((s, x) => s + Number(x.amount ?? x.total ?? 0), 0);
      setStats({
        collected: finance.collected,
        owed: inv.filter((i: any) => i.status !== "paid").reduce((s: number, i: any) => s + Number(i.total ?? 0), 0),
        vacant: un.filter((u: any) => u.status === "vacant").length,
        occupied: un.filter((u: any) => u.status === "occupied").length,
        expenses: finance.expenses,
        landlordPaid: finance.landlordPayments,
        openMaintenance: mt.filter((m: any) => m.status !== "done").length,
        laundryCollected: finance.laundryCollected,
        refunds: finance.refunds,
        discounts: finance.discounts,
        netProfit: finance.netProfit,
        netLoss: finance.netLoss,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Rent Collected", value: fmt(stats.collected), cls: "text-success", icon: "💵", edge: "border-t-emerald-500" },
    { label: "Laundry Coin Collections", value: fmt(stats.laundryCollected), cls: "text-success", icon: "🫧", edge: "border-t-teal-500" },
    { label: "Outstanding Invoices", value: fmt(stats.owed), cls: "text-danger", icon: "🧾", edge: "border-t-rose-500" },
    { label: "Landlord Payments", value: fmt(stats.landlordPaid), cls: "text-primary", icon: "🔑", edge: "border-t-amber-500" },
    { label: "Expenses", value: fmt(stats.expenses), cls: "text-slate-700", icon: "📉", edge: "border-t-sky-500" },
    { label: "Refunds", value: fmt(stats.refunds), cls: "text-danger", icon: "↩️", edge: "border-t-rose-500" },
    { label: "Discounts", value: fmt(stats.discounts), cls: "text-amber-700", icon: "🏷️", edge: "border-t-amber-500" },
    { label: "Net Profit", value: fmt(stats.netProfit), cls: "text-success", icon: "📈", edge: "border-t-primary-500" },
    { label: "Net Loss", value: fmt(stats.netLoss), cls: "text-danger", icon: "📉", edge: "border-t-red-600" },
    { label: "Occupancy", value: `${stats.occupied} occupied / ${stats.vacant} vacant`, cls: "text-primary", icon: "🏢", edge: "border-t-indigo-500" },
    { label: "Open Maintenance", value: String(stats.openMaintenance), cls: "text-danger", icon: "🛠", edge: "border-t-orange-500" },
  ];

  return (
    <div>
      <header className="mb-6 rounded-xl border-l-4 border-accent bg-gradient-to-r from-primary-900 via-primary-dark to-primary px-5 py-5 text-white shadow-card sm:px-6">
        <p className="text-xs font-semibold uppercase text-accent">Yazkap Properties · Management</p>
        <h1 className="mt-1 text-2xl font-bold">Management Overview</h1>
        <p className="mt-1 text-sm text-white/75">{new Date().getFullYear()} · All figures AED</p>
      </header>
      {loading && <p className="mt-6 text-sm text-slate-400">Loading…</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-lg border border-slate-200 border-t-[3px] ${c.edge} bg-white p-4 shadow-card transition hover:shadow-lift`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-slate-500">{c.label}</p>
              <span className="text-lg" aria-hidden>{c.icon}</span>
            </div>
            <p className={`mt-3 break-words text-2xl font-bold tabular-nums ${c.cls}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
