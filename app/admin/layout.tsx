"use client";
import { useEffect, useState } from "react";
import { supabase, signOut } from "@/lib/supabase";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const NAV = [
  ["📊 Overview", "/admin"], ["🏢 Units", "/admin/units"], ["👥 Tenants", "/admin/tenants"],
  ["💵 Transactions", "/admin/transactions"], ["🧾 Invoices", "/admin/invoices"], ["📉 Expenses", "/admin/expenses"],
  ["🔑 Landlord (A. Nady)", "/admin/landlord"], ["🛠 Maintenance", "/admin/maintenance"],
  ["🛏 Assets", "/admin/assets"], ["🧴 Consumables", "/admin/consumables"],
  ["💰 Deposits", "/admin/deposits"], ["📈 Reports", "/admin/reports"],
  ["🏦 Banks/Branches", "/admin/banks"], ["📢 Announcements", "/admin/announcements"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { location.href = "/login"; return; }
      const { data: prof } = await supabase
        .from("profiles")
        .select("role,approved")
        .eq("id", session.user.id)
        .single();
      if (prof?.role === "admin" && prof?.approved) setState("ok");
      else {
        await signOut();
        location.href = "/login?denied=1";
      }
    })();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    location.href = "/";
  };

  const linkCls = (href: string) => {
    const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
    return `rounded-lg px-3 py-2.5 text-sm transition ${
      active
        ? "bg-white/15 font-semibold text-white"
        : "text-primary-100 hover:bg-white/10 hover:text-white"
    }`;
  };

  if (state !== "ok") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          {state === "loading" ? "Checking admin access…" : "Admin access required."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile nav: horizontally scrollable chips */}
      <nav className="sticky top-16 z-30 flex gap-2 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        {NAV.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition ${
              (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href))
                ? "border-primary bg-primary-50 text-primary"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-primary-300 hover:text-primary"
            }`}
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
          <Link key={href} href={href} className={linkCls(href)}>{label}</Link>
        ))}
        <button
          onClick={handleSignOut}
          className="mt-6 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-accent transition hover:bg-white/10"
        >
          Sign Out
        </button>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
