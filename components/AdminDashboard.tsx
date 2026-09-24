"use client";
import { useEffect, useState } from "react";
import { supabase, signOut } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { fmt } from "@/lib/currency";

const NAV = [
  ["📊 Overview", "/admin"], ["🏢 Units", "/admin/units"], ["👥 Tenants", "/admin/tenants"],
  ["💵 Transactions", "/admin/transactions"], ["🧾 Invoices", "/admin/invoices"], ["📉 Expenses", "/admin/expenses"],
  ["🔑 Landlord (A. Nady)", "/admin/landlord"], ["🛠 Maintenance", "/admin/maintenance"],
  ["🛏 Assets", "/admin/assets"], ["🧴 Consumables", "/admin/consumables"],
  ["💰 Deposits", "/admin/deposits"], ["📈 Reports", "/admin/reports"],
  ["🏦 Banks/Branches", "/admin/banks"], ["📢 Announcements", "/admin/announcements"],
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ collected: 0, owed: 0, vacant: 0, occupied: 0, expenses: 0, landlordPaid: 0 });
  useEffect(() => { (async () => {
    const y = new Date().getFullYear();
    const [tr, inv, un, ex, lp] = await Promise.all([
      supabase.from("transactions").select("amount,currency").gte("date", `${y}-01-01`),
      supabase.from("invoices").select("total,status").neq("status", "paid"),
      supabase.from("units").select("status"),
      supabase.from("expenses").select("amount").gte("date", `${y}-01-01`),
      supabase.from("landlord_payments").select("amount").gte("date", `${y}-01-01`),
    ]);
    const sum = (r: any) => (r.data ?? []).reduce((s: number, x: any) => s + Number(x.amount ?? x.total ?? 0), 0);
    setStats({
      collected: sum(tr), owed: sum(inv),
      vacant: (un.data ?? []).filter((u: any) => u.status === "vacant").length,
      occupied: (un.data ?? []).filter((u: any) => u.status === "occupied").length,
      expenses: sum(ex), landlordPaid: sum(lp),
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
  ];

  const handleSignOut = async () => {
    await signOut();
    location.href = "/";
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile nav: horizontally scrollable chips */}
      <nav className="sticky top-16 z-30 flex gap-2 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        {NAV.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:border-primary-300 hover:text-primary"
          >
            {label}
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-danger"
        >
          Sign Out
        </button>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-primary-dark p-4 lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
        <Image src="/logo.svg" alt="Yazkap" width={180} height={48} className="mb-4 rounded-xl bg-white p-1.5" />
        {NAV.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg px-3 py-2.5 text-sm text-primary-100 transition hover:bg-white/10 hover:text-white"
          >
            {label}
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="mt-6 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-accent transition hover:bg-white/10"
        >
          Sign Out
        </button>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
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
      </main>
    </div>
  );
}