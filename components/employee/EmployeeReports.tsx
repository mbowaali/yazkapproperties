"use client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/currency";

type Summary = {
  year: number; rent_collected: number; laundry_collected: number; expenses: number;
  landlord_payments: number; refunds: number; discounts: number; net_profit: number; net_loss: number;
};

export default function EmployeeReports() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/employee/report?year=${year}`).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Report is unavailable.");
      setSummary(result.data);
      setError("");
    }).catch(reason => setError(reason.message ?? "Report is unavailable."));
  }, [year]);

  const cards = summary ? [
    { label: "Rent collected", amount: summary.rent_collected, border: "border-t-emerald-500", text: "text-emerald-700" },
    { label: "Laundry collected", amount: summary.laundry_collected, border: "border-t-teal-500", text: "text-teal-700" },
    { label: "Operating expenses", amount: summary.expenses, border: "border-t-rose-500", text: "text-rose-700" },
    { label: "Landlord payments", amount: summary.landlord_payments, border: "border-t-amber-500", text: "text-amber-700" },
    { label: "Refunds", amount: summary.refunds, border: "border-t-orange-500", text: "text-orange-700" },
    { label: "Discounts", amount: summary.discounts, border: "border-t-yellow-500", text: "text-yellow-700" },
    { label: "Net profit", amount: summary.net_profit, border: "border-t-primary", text: "text-success" },
    { label: "Net loss", amount: summary.net_loss, border: "border-t-red-600", text: "text-danger" },
  ] : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase text-primary">Employee workspace</p><h1 className="mt-1 text-2xl font-bold text-primary-dark">Financial report</h1></div>
        <select className="input sm:max-w-36" value={year} onChange={event => setYear(Number(event.target.value))} aria-label="Report year">
          {[year, year - 1, year - 2].map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </header>
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => <div key={card.label} className={`rounded-lg border border-slate-200 border-t-[3px] ${card.border} bg-white p-4 shadow-card`}>
          <p className="text-xs font-semibold uppercase text-slate-500">{card.label} · {year}</p>
          <p className={`mt-3 text-xl font-bold tabular-nums ${card.text}`}>{fmt(card.amount)}</p>
        </div>)}
      </div>
    </div>
  );
}