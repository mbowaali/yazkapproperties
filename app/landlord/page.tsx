"use client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/currency";

type Tab = "expenses" | "transactions" | "mypayments";

export default function LandlordPortal() {
  const [tab, setTab] = useState<Tab>("expenses");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [landlordPayments, setLandlordPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Landlord");

  // filters
  const [yearFilter, setYearFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(({ user }) => {
      if (!user || (user.role !== "landlord" && user.role !== "admin")) {
        location.href = "/login";
      } else {
        setName(user.full_name || "Landlord");
      }
    });
    fetch("/api/landlord").then(r => r.json()).then(data => {
      setExpenses(data.expenses ?? []);
      setTransactions(data.transactions ?? []);
      setLandlordPayments(data.landlordPayments ?? []);
      setLoading(false);
    });
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/";
  };

  const years = [...new Set([...expenses, ...transactions].map(r => r.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const categories = [...new Set(expenses.map(e => e.category).filter(Boolean))].sort();

  const filteredExpenses = expenses.filter(e => {
    if (yearFilter && e.date?.slice(0, 4) !== yearFilter) return false;
    if (catFilter && e.category !== catFilter) return false;
    if (search && !e.category?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredTx = transactions.filter(t => {
    if (yearFilter && t.date?.slice(0, 4) !== yearFilter) return false;
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const totalTx = filteredTx.reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const totalMyPayments = landlordPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const TABS = [
    { id: "expenses" as Tab, label: "📉 Expenses" },
    { id: "transactions" as Tab, label: "💵 Collections" },
    { id: "mypayments" as Tab, label: "🏠 My Rent Payments" },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-primary-900/20 border-l-4 border-l-accent bg-primary-900 px-4 py-4 text-white shadow-card">
        <div>
          <p className="text-xs font-semibold uppercase text-accent">Yazkap Properties</p>
          <h1 className="mt-1 text-lg font-bold">Financial overview</h1>
          <p className="text-xs text-white/70">Landlord Portal · {name}</p>
        </div>
        <button onClick={signOut} className="min-h-10 rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
          Sign Out
        </button>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 border-t-[3px] border-t-rose-500 bg-white p-4 shadow-card">
            <p className="text-xs text-slate-500">Total Expenses {yearFilter ? yearFilter : "(all)"}</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-danger">{fmt(totalExpenses)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 border-t-[3px] border-t-emerald-500 bg-white p-4 shadow-card">
            <p className="text-xs text-slate-500">Collections {yearFilter ? yearFilter : "(all)"}</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-success">{fmt(totalTx)}</p>
          </div>
          <div className="col-span-2 rounded-lg border border-slate-200 border-t-[3px] border-t-accent bg-white p-4 shadow-card sm:col-span-1">
            <p className="text-xs text-slate-500">My Rent Paid (total)</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-primary">{fmt(totalMyPayments)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <select className="input !w-auto !min-h-0 py-1.5 text-sm" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          {tab === "expenses" && (
            <select className="input !w-auto !min-h-0 py-1.5 text-sm" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          )}
          {tab === "expenses" && <input className="input !w-auto !min-h-0 py-1.5 text-sm flex-1 min-w-[160px]"
            placeholder="Search categories…" value={search} onChange={e => setSearch(e.target.value)} />}
        </div>

        {/* Tabs */}
        <nav aria-label="Landlord dashboard sections" className="no-scrollbar overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max gap-1">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
                tab === t.id ? "border-accent text-primary-dark" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}>
              {t.label}
            </button>
          ))}
          </div>
        </nav>

        {loading && <p className="text-sm text-slate-500 py-10 text-center">Loading…</p>}

        {/* ── EXPENSES ── */}
        {!loading && tab === "expenses" && (
          <div className="card !p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                {filteredExpenses.length} monthly summaries · Total: <span className="text-danger font-bold">{fmt(totalExpenses)}</span>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="table-clean min-w-[420px]">
                <thead>
                  <tr><th>Month</th><th>Category</th><th>Items</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 && (
                    <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">No expenses found.</td></tr>
                  )}
                  {filteredExpenses.map(e => (
                    <tr key={`${e.date}-${e.category}`}>
                      <td className="whitespace-nowrap">{e.date?.slice(0, 7)}</td>
                      <td>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          e.category === "Utilities" ? "bg-blue-100 text-blue-700" :
                          e.category === "Maintenance" ? "bg-amber-100 text-amber-700" :
                          e.category === "Staff" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                        }`}>{e.category}</span>
                      </td>
                      <td>{e.item_count}</td>
                      <td className="font-semibold text-danger">{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {!loading && tab === "transactions" && (
          <div className="card !p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-2 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">
                {filteredTx.length} monthly summaries · Total collected: <span className="text-success font-bold">{fmt(totalTx)}</span>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="table-clean min-w-[420px]">
                <thead>
                  <tr><th>Month</th><th>Payments</th><th>Currency</th><th>Total collected</th></tr>
                </thead>
                <tbody>
                  {filteredTx.length === 0 && (
                    <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">No collections found.</td></tr>
                  )}
                  {filteredTx.map(t => (
                    <tr key={`${t.date}-${t.currency}`}>
                      <td className="whitespace-nowrap">{t.date?.slice(0, 7)}</td>
                      <td>{t.payment_count}</td>
                      <td>{t.currency}</td>
                      <td className="font-semibold text-success">{fmt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MY PAYMENTS ── */}
        {!loading && tab === "mypayments" && (
          <div className="card !p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-2 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">
                {landlordPayments.length} payments · Total: <span className="text-primary font-bold">{fmt(totalMyPayments)}</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Contract: AED 5,800 / month to Yazkap Properties</p>
            </div>
            <div className="overflow-x-auto">
              <table className="table-clean min-w-[480px]">
                <thead>
                  <tr><th>Date</th><th>Month</th><th>Amount</th><th>Method</th></tr>
                </thead>
                <tbody>
                  {landlordPayments.length === 0 && (
                    <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">No payments recorded.</td></tr>
                  )}
                  {landlordPayments.map(p => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{p.date?.slice(0, 10)}</td>
                      <td>{p.month} {p.year}</td>
                      <td className="font-semibold text-primary">{fmt(p.amount)}</td>
                      <td>{p.method || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
