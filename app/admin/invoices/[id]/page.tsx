"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fmt } from "@/lib/currency";
import { amountInWords } from "@/lib/finance";
import SupabaseConfigNotice from "@/components/SupabaseConfigNotice";

type Invoice = { id: number; invoice_no: string; total: number; due_date: string | null; status: string; created_at: string | null };

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const { data, error } = await supabase.from("invoices").select("id,invoice_no,total,due_date,status,created_at").eq("id", id).single();
    if (error) setError(error.message);
    else setInv(data as Invoice);
    setLoading(false);
  })(); }, [id]);

  if (loading) return <p className="py-16 text-center text-sm text-slate-500">Loading invoice…</p>;
  if (!isSupabaseConfigured) return <SupabaseConfigNotice />;
  if (error || !inv) return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error ?? "Invoice not found."}</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <a href="/admin/invoices" className="text-sm font-semibold text-primary hover:underline">← Back to invoices</a>
        <button onClick={() => window.print()} className="btn-primary">🖨 Print / Save as PDF</button>
      </div>

      <div className="print-area card !p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-primary pb-5">
          <div>
            <p className="text-2xl font-bold text-primary-dark">Yazkap <span className="text-accent">Properties</span></p>
            <p className="mt-1 text-sm text-slate-500">Valencia Laundry Building<br />302 Electra Street, Abu Dhabi, UAE<br />+971 50 512 276 · mbowaali@gmail.com</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary-dark">RENT INVOICE</p>
            <p className="mt-1 text-sm"><span className="text-slate-400">No:</span> <span className="font-semibold">{inv.invoice_no}</span></p>
            <p className="text-sm"><span className="text-slate-400">Issued:</span> {(inv.created_at ?? "").slice(0, 10) || "—"}</p>
            <p className="text-sm"><span className="text-slate-400">Due:</span> {inv.due_date || "—"}</p>
          </div>
        </div>

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3">Rental payment — Valencia Laundry Building</td>
              <td className="py-3 text-right font-semibold">{fmt(inv.total)}</td>
            </tr>
            <tr>
              <td className="pt-3 text-right font-bold">Total due</td>
              <td className="pt-3 text-right text-xl font-bold text-primary-dark">{fmt(inv.total)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4 text-sm text-slate-600"><span className="text-slate-400">Amount in words:</span> {amountInWords(inv.total)}</p>

        <div className="mt-6 flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${
            inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
          }`}>
            {inv.status}
          </span>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-400">
          <p>Payment methods: Cash · Bank Transfer · Cheque — please reference the invoice number {inv.invoice_no} with your payment.</p>
          <p className="mt-1">Thank you for renting with Yazkap Properties. This invoice was generated automatically and is valid without signature.</p>
        </div>
      </div>
    </div>
  );
}
