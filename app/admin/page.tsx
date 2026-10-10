"use client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/currency";

async function q(table: string, select = "*") {
  const res = await fetch(`/api/db?table=${table}&select=${select}&limit=5000`);
  const json = await res.json();
  return (json.data ?? []) as any[];
}

export default function AdminOverview() {
  const [stats, setStats] = useState({ collected: 0, owed: 0, vacant: 0, occupied: 0, expenses: 0, landlordPaid: 0, openMaintenance: 0, laundryCollected: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const y = new Date().getFullYear();
      const [tr, inv, un, ex, lp, mt, lw] = await Promise.all([
        q("transactions", "amount,date"),
        q("invoices", "total,status"),
        q("units", "status"),
        q("expenses", "amount,date"),
        q("landlord_payments", "amount,date"),
        q("maintenance_requests", "id,status"),
        q("laundry_usage", "total_fee,date,paid"),
      ]);
      const sum = (rows: any[], dateField?: string) =>
        rows
          .filter(r => !dateField || String(r[dateField] ?? "").startsWith(String(y)))
          .reduce((s, x) => s + Number(x.amount ?? x.total ?? 0), 0);
      const laundryCollected = lw
        .filter((r: any) => r.paid && String(r.date ?? "").startsWith(String(y)))
        .reduce((s: number, r: any) => s + Number(r.total_fee ?? 0), 0);
      setStats({
        collected: sum(tr, "date"),
        owed: inv.filter((i: any) => i.status !== "paid").reduce((s: number, i: any) => s + Number(i.total ?? 0), 0),
        vacant: un.filter((u: any) => u.status === "vacant").length,
        occupied: un.filter((u: any) => u.status === "occupied").length,
        expenses: sum(ex, "date"),
        landlordPaid: sum(lp, "date"),
        openMaintenance: mt.filter((m: any) => m.status !== "done").length,
        laundryCollected,
      });
      setLoading(false);
    })();
  }, []);

  const profit = stats.collected + stats.laundryCollected - stats.expenses - stats.landlordPaid;

  const cards = [
    { label: "Rent Collected", value: fmt(stats.collected), cls: "text-success", icon: "💵" },
    { label: "Laundry Income", value: fmt(stats.laundryCollected), cls: "text-success", icon: "🫧" },
    { label: "Outstanding Invoices", value: fmt(stats.owed), cls: "text-danger", icon: "🧾" },
    { label: "Paid to Landlord (Nady)", value: fmt(stats.landlordPaid), cls: "text-primary", icon: "🔑" },
    { label: "Expenses", value: fmt(stats.expenses), cls: "text-slate-700", icon: "📉" },
    { label: "Net Profit (auto)", value: fmt(profit), cls: profit >= 0 ? "text-success" : "text-danger", icon: "📈" },
    { label: "Occupancy", value: `${stats.occupied} 🟢 / ${stats.vacant} 🔴`, cls: "text-primary", icon: "🏢" },
    { label: "Open Maintenance", value: String(stats.openMaintenance), cls: "text-danger", icon: "🛠" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary-dark">Owner Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Year {new Date().getFullYear()} · All figures AED</p>
      {loading && <p className="mt-6 text-sm text-slate-400">Loading…</p>}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card card-hover">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-lg" aria-hidden>{c.icon}</span>
              <p className="text-sm font-medium text-slate-500">{c.label}</p>
            </div>
            <p className={`mt-3 text-2xl font-bold ${c.cls}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
