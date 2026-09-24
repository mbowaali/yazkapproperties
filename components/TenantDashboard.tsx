"use client";
import { useEffect, useState } from "react";
import { supabase, signOut } from "@/lib/supabase";
import { fmt } from "@/lib/currency";

export default function TenantDashboard({ userId }: { userId: string }) {
  const [tx, setTx] = useState<any[]>([]);
  const [inv, setInv] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => { 
    (async () => {
      const { data: t } = await supabase.from("tenancies").select("id").eq("tenant_id", userId);
      if (!t?.length) return;
      const tid = t[0].id;
      supabase.from("transactions").select("date,type,amount,currency").eq("tenancy_id", tid).order("date", { ascending: false }).then(r => setTx(r.data ?? []));
      supabase.from("invoices").select("invoice_no,total,due_date,status,pdf_url").eq("tenancy_id", tid).then(r => setInv(r.data ?? []));
      supabase.from("announcements").select("title,body,created_at").eq("active", true).then(r => setNotes(r.data ?? []));
    })();
  }, [userId]);

  const handleSignOut = async () => {
    await signOut();
    location.href = "/";
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="text-2xl font-bold text-primary-dark">My Account</h1>
      <p className="mt-1 text-sm text-slate-500">Your invoices, payments and building notices</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="section-title mb-3">🧾 My Invoices</h2>
          {inv.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
          {inv.map((i) => (
            <div key={i.invoice_no} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-100 py-3 text-sm last:border-0">
              <span className="font-medium">{i.invoice_no}</span>
              <span className="text-slate-500">due {i.due_date}</span>
              <span className="ml-auto font-semibold">{fmt(i.total)}</span>
              <span className={i.status === "paid" ? "pill-paid" : "pill-unpaid"}>{i.status}</span>
              {i.pdf_url && (
                <a className="font-semibold text-primary hover:underline" href={i.pdf_url} target="_blank" rel="noopener noreferrer">
                  PDF
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="section-title mb-3">💵 My Payments</h2>
          {tx.length === 0 && <p className="text-sm text-slate-500">No payments recorded yet.</p>}
          {tx.map((t, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0">
              <span className="text-slate-500">{t.date}</span>
              <span className="capitalize">{t.type}</span>
              <span className="ml-auto font-semibold">{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-4">
          <h2 className="section-title mb-3">📢 Building Notices</h2>
          {notes.length === 0 && <p className="text-sm text-slate-500">No announcements.</p>}
          {notes.map((n, i) => (
            <div key={i} className="border-b border-slate-100 py-3 last:border-0">
              <h3 className="font-semibold text-slate-800">{n.title}</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{n.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button onClick={handleSignOut} className="btn-ghost">
            Sign Out
          </button>
          <a href="https://wa.me/97150512276" target="_blank" rel="noopener noreferrer" className="btn-accent">
            💬 WhatsApp Landlord
          </a>
        </div>
      </div>
  );
}