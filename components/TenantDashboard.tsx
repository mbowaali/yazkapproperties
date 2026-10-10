"use client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/currency";

type Profile = { full_name: string | null; phone: string | null; email: string | null; photo_url: string | null };

export default function TenantDashboard({ userId }: { userId: number }) {
  const [tx, setTx] = useState<any[]>([]);
  const [inv, setInv] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/tenant/profile").then(r => r.json()).then(({ data }) => setProfile(data ?? null));

    const q = (table: string, extra = "") =>
      fetch(`/api/db?table=${table}${extra}`).then(r => r.json());

    q("tenancies").then(({ data }) => {
      if (!data?.length) return;
      q("transactions", "&orderBy=date").then(({ data: t }) => setTx(t ?? []));
      q("invoices").then(({ data: i }) => setInv(i ?? []));
    });
    q("announcements").then(({ data }) => setNotes(data ?? []));
  }, [userId]);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/";
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="text-2xl font-bold text-primary-dark">My Account</h1>
      <p className="mt-1 text-sm text-slate-500">Your profile, invoices, payments and building notices</p>

      <div className="card mt-6">
        <h2 className="section-title mb-3">👤 My Profile</h2>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="shrink-0">
            {profile?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo_url} alt="Profile photo" className="h-24 w-24 rounded-2xl border border-slate-200 object-cover" />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-50 text-3xl text-primary-300" aria-hidden>👤</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-slate-900">{profile?.full_name || "—"}</p>
            <p className="text-sm text-slate-500">{profile?.phone || "No phone set"} · {profile?.email || "No email set"}</p>
          </div>
        </div>
      </div>

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
        <button onClick={handleSignOut} className="btn-ghost">Sign Out</button>
        <a href="https://wa.me/97150512276" target="_blank" rel="noopener noreferrer" className="btn-accent">
          💬 WhatsApp Landlord
        </a>
      </div>
    </div>
  );
}
