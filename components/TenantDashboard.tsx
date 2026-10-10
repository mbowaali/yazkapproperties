"use client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/currency";
import { ReceiptsTab, RequestsTab, DocumentsTab, ProfileTab } from "@/components/tenant/TenantTabs";
import TenantHelpChat from "@/components/tenant/TenantHelpChat";

type Tab = "overview" | "payments" | "invoices" | "receipts" | "requests" | "events" | "documents" | "profile";
type Agreement = { version: number; title: string; body: string; published_at: string };
type ContractState = {
  agreement: Agreement | null;
  signature: { version: number; signature_name: string; signed_at: string } | null;
};
type Adjustment = {
  id: number; adjustment_type: "refund" | "discount"; amount: number;
  currency: string; effective_date: string; reason: string;
  status: "pending" | "completed" | "cancelled";
};

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
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [manager, setManager] = useState<Record<string, string>>({});
  const [contract, setContract] = useState<ContractState | null>(null);
  const [contractLoading, setContractLoading] = useState(true);
  const [contractUnavailable, setContractUnavailable] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [contractBusy, setContractBusy] = useState(false);
  const [contractMessage, setContractMessage] = useState("");

  const fetchAll = () => {
    fetch("/api/tenant/profile").then(r => r.json()).then(({ data }) => setProfile(data));
    fetch("/api/db?table=transactions&orderBy=date&limit=200").then(r => r.json()).then(({ data }) => setTx(data ?? []));
    fetch("/api/db?table=invoices&orderBy=created_at&limit=200").then(r => r.json()).then(({ data }) => setInv(data ?? []));
    fetch("/api/db?table=receipts&orderBy=created_at&limit=200").then(r => r.json()).then(({ data }) => setReceipts(data ?? []));
    fetch("/api/db?table=tenant_requests&orderBy=created_at&limit=100").then(r => r.json()).then(({ data }) => setRequests(data ?? []));
    fetch("/api/db?table=tenant_events&orderBy=event_date&limit=50").then(r => r.json()).then(({ data }) => setEvents(data ?? []));
    fetch("/api/tenant/upload").then(r => r.json()).then(({ data }) => setDocs(data ?? []));
    fetch("/api/db?table=announcements&limit=20").then(r => r.json()).then(({ data }) => setAnnouncements(data ?? []));
    fetch("/api/tenant/adjustments").then(r => r.json()).then(({ data }) => setAdjustments(data ?? []));
    fetch("/api/admin/settings").then(r => r.json()).then(({ data }) => setManager(data ?? {}));
    fetch("/api/contracts/current")
      .then(r => {
        if (!r.ok) throw new Error("Could not load tenant rules");
        return r.json();
      })
      .then(data => setContract(data))
      .catch(() => setContractUnavailable(true))
      .finally(() => setContractLoading(false));
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
  const birthdayParts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Dubai", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const todayInDubai = `${birthdayParts.find(part => part.type === "month")?.value}-${birthdayParts.find(part => part.type === "day")?.value}`;
  const hasBirthdayToday = profile?.date_of_birth?.slice(5, 10) === todayInDubai;

  const signLatestContract = async () => {
    if (!contract?.agreement || !profile?.full_name || !contractAccepted) return;
    setContractBusy(true);
    setContractMessage("");
    const response = await fetch("/api/contracts/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: contract.agreement.version,
        signature_name: profile.full_name,
        accepted: true,
      }),
    });
    const result = await response.json();
    setContractBusy(false);
    if (!response.ok) {
      setContractMessage(result.error ?? "Could not record your acknowledgement.");
      return;
    }
    setContract({ ...contract, signature: result.signature });
    fetchAll();
  };

  if (contractLoading) return <p className="p-10 text-center text-sm text-slate-500">Loading your portal…</p>;
  if (contractUnavailable) return <p className="p-10 text-center text-sm text-danger">Tenant rules could not be loaded. Please contact property management.</p>;
  if (contract?.agreement && contract.signature?.version !== contract.agreement.version) {
    return (
      <main className="container-page max-w-3xl py-8 sm:py-12">
        <div className="card space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Version {contract.agreement.version}</p>
            <h1 className="mt-1 text-xl font-bold text-primary-dark">{contract.agreement.title}</h1>
            <p className="mt-1 text-sm text-slate-500">Please review the current rules to continue to your tenant dashboard.</p>
          </div>
          <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {contract.agreement.body}
          </div>
          <div>
            <label className="label">Electronic signature</label>
            <input className="input" value={profile?.full_name ?? ""} readOnly aria-label="Electronic signature using your registered full name" />
            <p className="mt-1 text-xs text-slate-500">Your registered full name will be recorded with the acknowledgement.</p>
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" checked={contractAccepted} onChange={e => setContractAccepted(e.target.checked)} />
            <span>I have read these rules and agree to acknowledge version {contract.agreement.version}.</span>
          </label>
          {contractMessage && <p className="text-sm text-danger" role="alert">{contractMessage}</p>}
          <button type="button" className="btn-primary" disabled={contractBusy || !contractAccepted || !profile?.full_name} onClick={signLatestContract}>
            {contractBusy ? "Recording…" : "Sign & Continue"}
          </button>
          <button type="button" className="btn-ghost" onClick={handleSignOut}>Sign Out</button>
        </div>
      </main>
    );
  }

  return (
    <div className="container-page py-5 sm:py-8">
      <header className="mb-6 rounded-xl border-l-4 border-accent bg-gradient-to-r from-primary-900 via-primary-dark to-primary px-4 py-5 text-white shadow-card sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {profile?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-full border-2 border-white/70 object-cover" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-2xl font-semibold text-white">
                {profile?.full_name?.[0]?.toUpperCase() ?? "Y"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-accent">Yazkap Properties · Tenant Portal</p>
              <h1 className="mt-1 text-lg font-bold leading-tight sm:text-2xl">
                Welcome, {profile?.full_name?.split(" ")[0] ?? "Tenant"}
              </h1>
              <p className="mt-1 text-sm text-white/75">
                {profile?.unit_label ? `Unit ${profile.unit_label}` : "Your home, in one place"}
                {profile?.joining_date ? ` · Since ${profile.joining_date?.slice(0, 10)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <a href="https://wa.me/971505102276" target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-primary-900 transition hover:bg-accent-light sm:flex-none sm:px-4 sm:text-sm">
              💬 Contact Manager
            </a>
            <button onClick={handleSignOut}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <nav aria-label="Tenant dashboard sections" className="no-scrollbar mb-6 overflow-x-auto border-b border-slate-200">
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

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total Paid", value: fmt(totalPaid), cls: "text-success", icon: "💵", edge: "border-t-emerald-500" },
              { label: "Outstanding", value: fmt(totalOwed), cls: totalOwed > 0 ? "text-danger" : "text-success", icon: "⏳", edge: totalOwed > 0 ? "border-t-rose-500" : "border-t-emerald-500" },
              { label: "Open Invoices", value: String(pendingInv), cls: pendingInv > 0 ? "text-danger" : "text-success", icon: "🧾", edge: pendingInv > 0 ? "border-t-rose-500" : "border-t-emerald-500" },
              { label: "Monthly Rent", value: profile?.monthly_rent ? fmt(profile.monthly_rent) : "—", cls: "text-primary", icon: "🏠", edge: "border-t-accent" },
            ].map(c => (
              <div key={c.label} className={`rounded-lg border border-slate-200 border-t-[3px] ${c.edge} bg-white p-4 shadow-card`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">{c.label}</p>
                  <span className="text-lg" aria-hidden>{c.icon}</span>
                </div>
                <p className={`mt-3 break-words text-xl font-bold tabular-nums sm:text-2xl ${c.cls}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {hasBirthdayToday && (
            <div className="overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50 p-4 sm:p-5">
              <div className="flex items-center gap-4">
                {profile.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-full border-2 border-white object-cover shadow-sm" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-3xl shadow-sm" aria-hidden>🎂</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">Happy birthday, {profile.full_name?.split(" ")[0] ?? "Tenant"}! 🎉</p>
                  <p className="mt-1 text-sm text-slate-700">Wishing you a joyful day and a wonderful year ahead. From Yazid and the Yazkap Properties team.</p>
                </div>
                <span className="hidden shrink-0 text-2xl sm:block" aria-hidden>🎈 ✨ 🎁</span>
              </div>
            </div>
          )}

          {/* Manager card */}
          {(manager.admin_name || manager.admin_photo) && (
            <div className="card">
              <h2 className="section-title mb-3">🏢 Your Property Manager</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                {manager.admin_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={manager.admin_photo} alt="Yazid Ntulume" className="h-14 w-14 rounded-2xl object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl shrink-0">👤</div>
                )}
                <div>
                  <p className="font-bold text-slate-800 text-sm">Yazid Ntulume</p>
                  <p className="text-xs text-slate-500">Property Manager</p>
                  {manager.admin_bio && <p className="mt-0.5 text-xs text-slate-600">{manager.admin_bio}</p>}
                </div>
              </div>
            </div>
          )}

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

      {tab === "payments" && (
        <section className="card !p-0 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="section-title">Refunds & Discounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table-clean min-w-[560px]">
              <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {adjustments.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-500">No refunds or discounts recorded.</td></tr>}
                {adjustments.map(adjustment => (
                  <tr key={adjustment.id}>
                    <td>{adjustment.effective_date?.slice(0, 10)}</td>
                    <td className="capitalize">{adjustment.adjustment_type}</td>
                    <td className="font-semibold">{fmt(adjustment.amount)}</td>
                    <td>{adjustment.reason}</td>
                    <td className="capitalize">{adjustment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
      <TenantHelpChat />
    </div>
  );
}
