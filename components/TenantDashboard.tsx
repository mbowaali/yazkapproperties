"use client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/currency";
import { ReceiptsTab, RequestsTab, DocumentsTab, ProfileTab } from "@/components/tenant/TenantTabs";

type Tab = "overview" | "payments" | "invoices" | "receipts" | "requests" | "events" | "documents" | "profile";

export default function TenantDashboard({ userId }: { userId: number }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<any>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [inv, setInv] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const fetchAll = () => {
    fetch("/api/tenant/profile").then(r => r.json()).then(({ data }) => setProfile(data));
    fetch("/api/db?table=transactions&orderBy=date&limit=200").then(r => r.json()).then(({ data }) => setTx(data ?? []));
    fetch("/api/db?table=invoices&orderBy=created_at&limit=200").then(r => r.json()).then(({ data }) => setInv(data ?? []));
    fetch("/api/db?table=receipts&orderBy=created_at&limit=200").then(r => r.json()).then(({ data }) => setReceipts(data ?? []));
    fetch("/api/db?table=tenant_requests&orderBy=created_at&limit=100").then(r => r.json()).then(({ data }) => setRequests(data ?? []));
    fetch("/api/db?table=tenant_events&orderBy=event_date&limit=50").then(r => r.json()).then(({ data }) => setEvents(data ?? []));
    fetch("/api/tenant/upload").then(r => r.json()).then(({ data }) => setDocs(data ?? []));
    fetch("/api/db?table=announcements&limit=20").then(r => r.json()).then(({ data }) => setAnnouncements(data ?? []));
  };

  useEffect(() => { fetchAll(); }, [userId]);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/";
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "📊 Overview" },
    { id: "payments", label: "💵 Payments" },
    { id: "invoices", label: "🧾 Invoices" },
    { id: "receipts", label: "🖨 Receipts" },
    { id: "requests", label: "📬 Requests" },
    { id: "events", label: "📅 News & Events" },
    { id: "documents", label: "📁 Documents" },
    { id: "profile", label: "👤 Profile" },
  ];

  const totalPaid = tx.reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const totalOwed = inv.filter(i => i.status !== "paid").reduce((s, i) => s + Number(i.total ?? 0), 0);
  const pendingInv = inv.filter(i => i.status !== "paid").length;

  return (
    <div className="container-page py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">
            Welcome, {profile?.full_name?.split(" ")[0] ?? "Tenant"} 👋
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {profile?.unit_label ? `Unit: ${profile.unit_label}` : "Yazkap Properties Portal"}
            {profile?.joining_date ? ` · Joined ${profile.joining_date?.slice(0, 10)}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="https://wa.me/97150512276" target="_blank" rel="noopener noreferrer" className="btn-accent !min-h-0 px-4 py-2 text-sm">
            💬 WhatsApp
          </a>
          <button onClick={handleSignOut} className="btn-ghost !min-h-0 px-4 py-2 text-sm">Sign Out</button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6 no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
              tab === t.id ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-primary-50 hover:text-primary"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Paid", value: fmt(totalPaid), cls: "text-success", icon: "💵" },
              { label: "Outstanding", value: fmt(totalOwed), cls: totalOwed > 0 ? "text-danger" : "text-success", icon: "⏳" },
              { label: "Pending Invoices", value: String(pendingInv), cls: pendingInv > 0 ? "text-danger" : "text-success", icon: "🧾" },
              { label: "Monthly Rent", value: profile?.monthly_rent ? fmt(profile.monthly_rent) : "—", cls: "text-primary", icon: "🏠" },
            ].map(c => (
              <div key={c.label} className="card card-hover">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.icon}</span>
                  <p className="text-xs font-medium text-slate-500">{c.label}</p>
                </div>
                <p className={`mt-2 text-xl font-bold ${c.cls}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="card">
              <h2 className="section-title mb-3">📢 Building Notices</h2>
              {announcements.map((n, i) => (
                <div key={i} className="border-b border-slate-100 py-3 last:border-0">
                  <p className="font-semibold text-slate-800">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Upcoming events */}
          {events.length > 0 && (
            <div className="card">
              <h2 className="section-title mb-3">📅 Upcoming Events</h2>
              {events.slice(0, 3).map((ev, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
                  <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    ev.type === "reminder" ? "bg-amber-100 text-amber-700" :
                    ev.type === "event" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                  }`}>{ev.type}</span>
                  <div>
                    <p className="font-semibold text-slate-800">{ev.title}</p>
                    {ev.event_date && <p className="text-xs text-slate-400">{ev.event_date?.slice(0, 10)}</p>}
                    {ev.body && <p className="mt-0.5 text-sm text-slate-600">{ev.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent payments */}
          <div className="card">
            <h2 className="section-title mb-3">💵 Recent Payments</h2>
            {tx.length === 0 && <p className="text-sm text-slate-500">No payments recorded yet.</p>}
            {tx.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0">
                <span className="text-slate-400">{t.date?.slice(0, 10)}</span>
                <span className="capitalize text-slate-600">{t.type}</span>
                <span className="ml-auto font-semibold text-success">{fmt(t.amount)}</span>
              </div>
            ))}
            {tx.length > 5 && (
              <button onClick={() => setTab("payments")} className="mt-2 text-xs font-semibold text-primary hover:underline">
                View all {tx.length} payments →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {tab === "payments" && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <h2 className="section-title">💵 Payment History</h2>
            <p className="text-sm text-slate-500 mt-1">Total paid: <span className="font-semibold text-success">{fmt(totalPaid)}</span></p>
          </div>
          <div className="overflow-x-auto">
            <table className="table-clean min-w-[500px]">
              <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
              <tbody>
                {tx.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No payments yet.</td></tr>}
                {tx.map((t, i) => (
                  <tr key={i}>
                    <td>{t.date?.slice(0, 10)}</td>
                    <td className="capitalize">{t.type}</td>
                    <td className="font-semibold text-success">{fmt(t.amount)}</td>
                    <td>{t.method || "—"}</td>
                    <td><span className="pill-paid">{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── INVOICES ── */}
      {tab === "invoices" && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <h2 className="section-title">🧾 Invoices</h2>
            {totalOwed > 0 && <p className="text-sm text-danger mt-1 font-semibold">Outstanding: {fmt(totalOwed)}</p>}
          </div>
          <div className="overflow-x-auto">
            <table className="table-clean min-w-[560px]">
              <thead><tr><th>Invoice No.</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {inv.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">No invoices yet.</td></tr>}
                {inv.map((i, idx) => (
                  <tr key={idx}>
                    <td className="font-medium">{i.invoice_no}</td>
                    <td>{i.due_date?.slice(0, 10) || "—"}</td>
                    <td className="font-semibold">{fmt(i.total)}</td>
                    <td><span className={i.status === "paid" ? "pill-paid" : "pill-unpaid"}>{i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RECEIPTS ── */}
      {tab === "receipts" && <ReceiptsTab receipts={receipts} onRefresh={fetchAll} />}

      {/* ── REQUESTS ── */}
      {tab === "requests" && <RequestsTab requests={requests} onRefresh={fetchAll} />}

      {/* ── EVENTS ── */}
      {tab === "events" && (
        <div className="space-y-3">
          {events.length === 0 && <div className="card py-10 text-center text-sm text-slate-500">No news or events posted yet.</div>}
          {events.map((ev, i) => (
            <div key={i} className="card">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  ev.type === "reminder" ? "bg-amber-100 text-amber-700" :
                  ev.type === "event" ? "bg-blue-100 text-blue-700" :
                  ev.type === "notice" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                }`}>{ev.type}</span>
                {ev.event_date && <span className="text-xs text-slate-400 mt-0.5">{ev.event_date?.slice(0, 10)}</span>}
              </div>
              <h3 className="mt-2 font-semibold text-slate-800">{ev.title}</h3>
              {ev.body && <p className="mt-1 text-sm text-slate-600 leading-relaxed">{ev.body}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {tab === "documents" && <DocumentsTab docs={docs} onRefresh={fetchAll} />}

      {/* ── PROFILE ── */}
      {tab === "profile" && <ProfileTab profile={profile} onRefresh={fetchAll} />}
    </div>
  );
}
