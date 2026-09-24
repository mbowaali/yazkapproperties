"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fmt } from "@/lib/currency";

export default function AdminOverview() {
  const [stats, setStats] = useState({ collected: 0, owed: 0, vacant: 0, occupied: 0, expenses: 0, landlordPaid: 0, openMaintenance: null as number | null });

  useEffect(() => { (async () => {
    const y = new Date().getFullYear();
    const [tr, inv, un, ex, lp, mt] = await Promise.all([
      supabase.from("transactions").select("amount,currency").gte("date", `${y}-01-01`),
      supabase.from("invoices").select("total,status").neq("status", "paid"),
      supabase.from("units").select("status"),
      supabase.from("expenses").select("amount").gte("date", `${y}-01-01`),
      supabase.from("landlord_payments").select("amount").gte("date", `${y}-01-01`),
      supabase.from("maintenance_requests").select("id,status"),
    ]);
    const sum = (r: any) => (r.data ?? []).reduce((s: number, x: any) => s + Number(x.amount ?? x.total ?? 0), 0);
    setStats({
      collected: sum(tr), owed: sum(inv),
      vacant: (un.data ?? []).filter((u: any) => u.status === "vacant").length,
      occupied: (un.data ?? []).filter((u: any) => u.status === "occupied").length,
      expenses: sum(ex), landlordPaid: sum(lp),
      openMaintenance: mt.error ? null : (mt.data ?? []).filter((m: any) => m.status !== "done").length,
    });
  })(); }, []);

  const profit = stats.collected - stats.expenses - stats.landlordPaid;

  const cards = [
    { label: "Collected (Income)", value: fmt(stats.collected), cls: "text-success", icon: "💵" },
    { label: "Outstanding Invoices", value: fmt(stats.owed), cls: "text-danger", icon: "🧾" },
    { label: "Paid to Landlord (Nady)", value: fmt(stats.landlordPaid), cls: "text-primary", icon: "🔑" },
    { label: "Expenses", value: fmt(stats.expenses), cls: "text-slate-700", icon: "📉" },
    { label: "Net Profit (auto)", value: fmt(profit), cls: profit >= 0 ? "text-success" : "text-danger", icon: "📈" },
    { label: "Occupancy", value: `${stats.occupied} 🟢 / ${stats.vacant} 🔴`, cls: "text-primary", icon: "🏢" },
    ...(stats.openMaintenance !== null
      ? [{ label: "Open Maintenance", value: String(stats.openMaintenance), cls: "text-danger", icon: "🛠" }]
      : []),
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary-dark">Owner Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Year {new Date().getFullYear()} · All figures AED</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card card-hover">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-lg" aria-hidden>
                {c.icon}
              </span>
              <p className="text-sm font-medium text-slate-500">{c.label}</p>
            </div>
            <p className={`mt-3 text-2xl font-bold ${c.cls}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
