"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const MODULES = [
  { href: "/employee/transactions", permission: "view_transactions", title: "Transactions", icon: "💵", group: "Finance" },
  { href: "/employee/expenses", permission: "view_expenses", title: "Expenses", icon: "📉", group: "Finance" },
  { href: "/employee/invoices", permission: "view_invoices", title: "Invoices", icon: "🧾", group: "Finance" },
  { href: "/employee/deposits", permission: "view_deposits", title: "Deposits", icon: "💰", group: "Finance" },
  { href: "/employee/tenants", permission: "view_tenants", title: "Tenants", icon: "👥", group: "Property" },
  { href: "/employee/units", permission: "view_units", title: "Units", icon: "🏢", group: "Property" },
  { href: "/employee/maintenance", permission: "view_maintenance", title: "Maintenance", icon: "🛠", group: "Operations" },
  { href: "/employee/requests", permission: "view_requests", title: "Tenant requests", icon: "📬", group: "Operations" },
  { href: "/employee/receipts", permission: "view_receipts", title: "Receipts", icon: "🖨", group: "Operations" },
  { href: "/employee/laundry", permission: "manage_laundry", title: "Laundry collections", icon: "🪙", group: "Operations" },
  { href: "/employee/announcements", permission: "manage_announcements", title: "Announcements", icon: "📢", group: "Communications" },
  { href: "/employee/events", permission: "manage_events", title: "News & events", icon: "📅", group: "Communications" },
  { href: "/employee/assets", permission: "manage_assets", title: "Assets", icon: "🛏", group: "Operations" },
  { href: "/employee/reports", permission: "view_reports", title: "Reports", icon: "📈", group: "Finance" },
];

const MANAGE_GRANT: Record<string, string> = {
  view_transactions: "manage_transactions", view_expenses: "manage_expenses",
  view_invoices: "manage_invoices", view_tenants: "manage_tenants",
  view_units: "manage_units", view_maintenance: "manage_maintenance",
  view_requests: "reply_requests", view_receipts: "approve_receipts",
};

export default function EmployeeHome() {
  const [name, setName] = useState("Team member");
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/auth/me").then(r => r.json()), fetch("/api/employee/permissions").then(r => r.json())])
      .then(([session, access]) => {
        setName(session.user?.full_name?.split(" ")[0] ?? "Team member");
        setPermissions(access.data ?? []);
      });
  }, []);

  const available = MODULES.filter(module => permissions.includes("all") || permissions.includes(module.permission) ||
    (MANAGE_GRANT[module.permission] && permissions.includes(MANAGE_GRANT[module.permission])));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-xl border-l-4 border-accent bg-gradient-to-r from-primary-900 via-primary-dark to-primary px-5 py-5 text-white shadow-card sm:px-6">
        <p className="text-xs font-semibold uppercase text-accent">Yazkap Properties · Employee Portal</p>
        <h1 className="mt-1 text-2xl font-bold">Welcome, {name}</h1>
        <p className="mt-1 text-sm text-white/75">Your assigned work areas</p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {["Finance", "Property", "Operations", "Communications"].map(group => {
          const items = available.filter(module => module.group === group);
          if (!items.length) return null;
          return (
            <section key={group}>
              <h2 className="mb-3 text-xs font-semibold uppercase text-slate-500">{group}</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map(item => (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-card transition hover:border-primary-200 hover:shadow-lift">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-xl" aria-hidden>{item.icon}</span>
                    <span className="font-semibold text-slate-800">{item.title}</span>
                    <span className="ml-auto text-slate-400" aria-hidden>→</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase text-slate-500">Communications</h2>
          <Link href="/employee/chat" className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-card transition hover:border-primary-200 hover:shadow-lift">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-xl" aria-hidden>💬</span>
            <span className="font-semibold text-slate-800">Team Chat</span>
            <span className="ml-auto text-slate-400" aria-hidden>→</span>
          </Link>
        </section>
      </div>
    </div>
  );
}