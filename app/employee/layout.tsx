"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [perms, setPerms] = useState<string[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(({ user }) => {
      if (!user || (user.role !== "employee" && user.role !== "admin")) {
        location.href = "/login";
        return;
      }
      setUser(user);
      if (user.role === "admin") {
        // Admin has all permissions
        setPerms(["all"]);
      } else {
        fetch("/api/employee/permissions").then(r => r.json()).then(({ data }) => {
          setPerms(data ?? []);
          setState("ok");
        }).catch(() => setState("denied"));
      }
      if (user.role === "admin") setState("ok");
    });
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/";
  };

  const has = (p: string) => {
    if (perms.includes("all") || perms.includes(p)) return true;
    const manageGrant = ({
      view_transactions: "manage_transactions", view_expenses: "manage_expenses",
      view_invoices: "manage_invoices", view_tenants: "manage_tenants",
      view_units: "manage_units", view_maintenance: "manage_maintenance",
      view_requests: "reply_requests", view_receipts: "approve_receipts",
    } as Record<string, string>)[p];
    return Boolean(manageGrant && perms.includes(manageGrant));
  };

  const NAV = [
    { label: "📊 Overview", href: "/employee", always: true },
    { label: "💵 Transactions", href: "/employee/transactions", perm: "view_transactions" },
    { label: "📉 Expenses", href: "/employee/expenses", perm: "view_expenses" },
    { label: "🧾 Invoices", href: "/employee/invoices", perm: "view_invoices" },
    { label: "👥 Tenants", href: "/employee/tenants", perm: "view_tenants" },
    { label: "🏢 Units", href: "/employee/units", perm: "view_units" },
    { label: "🛠 Maintenance", href: "/employee/maintenance", perm: "view_maintenance" },
    { label: "📬 Requests", href: "/employee/requests", perm: "view_requests" },
    { label: "🖨 Receipts", href: "/employee/receipts", perm: "view_receipts" },
    { label: "📢 Announcements", href: "/employee/announcements", perm: "manage_announcements" },
    { label: "📅 Events", href: "/employee/events", perm: "manage_events" },
    { label: "🪙 Laundry", href: "/employee/laundry", perm: "manage_laundry" },
    { label: "🛏 Assets", href: "/employee/assets", perm: "manage_assets" },
    { label: "💰 Deposits", href: "/employee/deposits", perm: "view_deposits" },
    { label: "📈 Reports", href: "/employee/reports", perm: "view_reports" },
    { label: "💬 Team Chat", href: "/employee/chat", always: true },
  ].filter(n => n.always || has(n.perm!));

  if (state !== "ok") return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-slate-500">{state === "loading" ? "Loading…" : "Access denied."}</p>
    </div>
  );

  const linkCls = (href: string) => {
    const active = href === "/employee" ? pathname === "/employee" : pathname.startsWith(href);
    return `rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-white/15 font-semibold text-white" : "text-primary-100 hover:bg-white/10 hover:text-white"}`;
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile nav */}
      <nav className="no-print sticky top-16 z-30 flex gap-2 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        {NAV.map(n => (
          <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition ${
            (n.href === "/employee" ? pathname === "/employee" : pathname.startsWith(n.href))
              ? "border-primary bg-primary-50 text-primary" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-primary-300 hover:text-primary"
          }`}>{n.label}</Link>
        ))}
        <button onClick={signOut} className="whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-danger">Sign Out</button>
      </nav>
      {/* Sidebar */}
      <aside className="no-print hidden w-64 shrink-0 flex-col bg-primary-dark p-4 lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
        <div className="mb-4 rounded-xl bg-white/10 px-3 py-3">
          <p className="font-bold text-white text-sm">{user?.full_name}</p>
          <p className="text-xs text-primary-200 mt-0.5">Employee Portal</p>
        </div>
        {NAV.map(n => <Link key={n.href} href={n.href} className={linkCls(n.href)}>{n.label}</Link>)}
        <button onClick={signOut} className="mt-6 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-accent transition hover:bg-white/10">Sign Out</button>
      </aside>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
