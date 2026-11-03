"use client";
import { useEffect, useState, useRef } from "react";

type User = { id: number; email: string; full_name: string | null; phone: string | null; emirates_id: string | null; employer: string | null; unit_label: string | null; role: string; approved: boolean; created_at: string; setup_completed_at: string | null; invite_expires_at: string | null };

type ExistingTenant = { id: number; full_name: string; email: string | null; phone: string | null; status: string | null };
type InviteChannel = "email" | "whatsapp" | "both";
type InviteDelivery = { channel: InviteChannel; emailSent: boolean; whatsappSent: boolean };

export default function AccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: "", email: "", phone: "", unit_label: "" });
  const [inviteChannel, setInviteChannel] = useState<InviteChannel>("email");
  const [inviteDelivery, setInviteDelivery] = useState<InviteDelivery | null>(null);
  const [existingTenants, setExistingTenants] = useState<ExistingTenant[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tenantSearchLoading, setTenantSearchLoading] = useState(false);
  const [tenantSearchError, setTenantSearchError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const load = () =>
    fetch("/api/admin/users").then(r => r.json()).then(({ data }) => {
      setUsers(data ?? []);
      setLoading(false);
    });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search the tenant roster as the name is typed instead of filtering a stale local list.
  useEffect(() => {
    const query = inviteForm.full_name.trim();
    if (!showInvite || !query) {
      setExistingTenants([]);
      setTenantSearchLoading(false);
      setTenantSearchError("");
      return;
    }

    setExistingTenants([]);
    setTenantSearchLoading(true);
    setTenantSearchError("");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query });
        const response = await fetch(`/api/admin/tenants/search?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to search existing tenants.");
        }
        if (!Array.isArray(data.tenants)) {
          throw new Error("The tenant search returned an invalid response.");
        }
        setExistingTenants(data.tenants);
      } catch (error) {
        if (!controller.signal.aborted) {
          setExistingTenants([]);
          setTenantSearchError(error instanceof Error ? error.message : "Failed to search existing tenants.");
        }
      } finally {
        if (!controller.signal.aborted) setTenantSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [inviteForm.full_name, showInvite]);

  // Select tenant from dropdown and auto-fill all fields
  const selectTenant = (tenant: ExistingTenant) => {
    setInviteForm({
      full_name: tenant.full_name,
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      unit_label: "",
    });
    setShowDropdown(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: number, approved: boolean) => {
    setMsg("");
    setError("");
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approved }),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not update tenant access."); return; }
    setMsg(approved ? "✅ Account approved." : "Account suspended.");
    load();
  };

  const createInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteBusy(true);
    setError("");
    setMsg("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inviteForm, channel: inviteChannel }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Could not create setup link.");
      }

      setInviteUrl(result.setup_url);
      setInviteDelivery(result.delivery);
      setInviteForm({ full_name: "", email: "", phone: "", unit_label: "" });
      const emailSent = inviteChannel === "whatsapp" || result.delivery.emailSent;
      const whatsappSent = inviteChannel === "email" || result.delivery.whatsappSent;
      const allSent = emailSent && whatsappSent;
      const anySent = result.delivery.emailSent || result.delivery.whatsappSent;
      setMsg(allSent
        ? "✅ Tenant account created and setup link sent."
        : anySent
          ? "⚠️ Invite was only sent through one selected channel. Check delivery status below."
          : "⚠️ Tenant account created, but the message could not be sent. Copy or share the link below.");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create setup link.");
    } finally {
      setInviteBusy(false);
    }
  };

  const shareInvite = async () => {
    if (!inviteUrl) return;
    const shareData = { title: "Complete your Yazkap tenant profile", text: "Use this secure link to complete your tenant profile and sign the current rules:", url: inviteUrl };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* User can still copy the link. */ }
    }
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary-dark">👤 Tenant Accounts</h1>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Create tenant accounts, send secure setup links, and approve portal access.</p>
        <button onClick={() => { setShowInvite(value => !value); setInviteUrl(""); setError(""); }} className="btn-primary">
          {showInvite ? "Close invite" : "Create tenant invite"}
        </button>
      </div>
      {msg && (
        <p
          className={`mt-3 rounded-lg px-4 py-3 text-sm font-medium ${
            msg.startsWith("✅") ? "bg-green-50 text-green-800" :
            msg.startsWith("⚠️") ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-700"
          }`}
          role="status"
        >{msg}</p>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

      {showInvite && (
        <section className="card mt-4 space-y-4">
          <div>
            <h2 className="font-semibold text-primary-dark">New tenant</h2>
            <p className="mt-1 text-xs text-slate-500">Their account stays pending until you approve it after setup.</p>
          </div>
          {!inviteUrl ? (
            <form onSubmit={createInvite} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="invite-name">Full name</label>
                <input id="invite-name" className="input" value={inviteForm.full_name} required maxLength={180}
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={showDropdown}
                  aria-controls="existing-tenant-results"
                  onFocus={() => setShowDropdown(true)}
                  onChange={event => {
                    setInviteForm({ ...inviteForm, full_name: event.target.value });
                    setShowDropdown(true);
                  }} />
                {showDropdown && inviteForm.full_name.trim() && (
                  <div
                    id="existing-tenant-results"
                    className="relative z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                    ref={dropdownRef}
                    role="listbox"
                    aria-label="Existing tenant matches"
                  >
                    {tenantSearchLoading ? (
                      <p className="px-3 py-2 text-sm text-slate-500">Searching existing tenants…</p>
                    ) : tenantSearchError ? (
                      <p className="px-3 py-2 text-sm text-danger" role="alert">{tenantSearchError}</p>
                    ) : existingTenants.length > 0 ? (
                      existingTenants.slice(0, 5).map(tenant => (
                        <button
                          key={tenant.id}
                          type="button"
                          role="option"
                          aria-selected="false"
                          className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50"
                          onClick={() => selectTenant(tenant)}
                        >
                          <span className="block text-sm font-medium text-slate-800">{tenant.full_name}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {[tenant.email, tenant.phone, tenant.status].filter(Boolean).join(" · ") || "No contact details"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-slate-500">No existing tenant found. Continue entering a new tenant.</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="label" htmlFor="invite-email">Email</label>
                <input id="invite-email" className="input" type="email" value={inviteForm.email} required maxLength={320}
                  onChange={event => setInviteForm({ ...inviteForm, email: event.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="invite-phone">Phone</label>
                <input id="invite-phone" className="input" type="tel" value={inviteForm.phone}
                  onChange={event => setInviteForm({ ...inviteForm, phone: event.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="invite-unit">Unit</label>
                <input id="invite-unit" className="input" value={inviteForm.unit_label}
                  onChange={event => setInviteForm({ ...inviteForm, unit_label: event.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="invite-channel">Send setup link by</label>
                <select
                  id="invite-channel"
                  className="input"
                  value={inviteChannel}
                  onChange={event => setInviteChannel(event.target.value as InviteChannel)}
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="both">Email and WhatsApp</option>
                </select>
                {(inviteChannel === "whatsapp" || inviteChannel === "both") && (
                  <p className="mt-1 text-xs text-slate-500">A valid WhatsApp-enabled phone number is required.</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={inviteBusy || ((inviteChannel === "whatsapp" || inviteChannel === "both") && !inviteForm.phone.trim())}
                >
                  {inviteBusy ? "Creating and sending…" : "Create account and send invite"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {inviteDelivery && (
                <p className={`rounded-lg px-3 py-2 text-sm ${
                  inviteDelivery.emailSent || inviteDelivery.whatsappSent
                    ? "bg-green-50 text-green-800"
                    : "bg-amber-50 text-amber-800"
                }`}>
                  {inviteDelivery.emailSent && inviteDelivery.whatsappSent
                    ? "Sent by email and WhatsApp."
                    : inviteDelivery.emailSent
                      ? "Sent by email."
                      : inviteDelivery.whatsappSent
                        ? "Sent by WhatsApp."
                        : `Could not send by ${inviteDelivery.channel === "both" ? "email or WhatsApp" : inviteDelivery.channel}. Use the link below to share it manually.`}
                </p>
              )}
              <label className="label" htmlFor="setup-link">Secure setup link · expires in 7 days</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="setup-link" className="input font-mono text-sm" value={inviteUrl} readOnly onFocus={event => event.target.select()} />
                <button type="button" className="btn-primary shrink-0" onClick={shareInvite}>{copied ? "Copied" : "Share link"}</button>
              </div>
              <p className="text-xs text-slate-500">The link works once. The tenant completes their details, sets a password, and signs the current rules before you approve access.</p>
            </div>
          )}
        </section>
      )}
      <div className="card mt-4 !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[640px]">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Unit</th><th>Status</th><th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">Loading…</td></tr>}
              {!loading && users.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No tenant registrations yet.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.full_name || "—"}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || "—"}</td>
                  <td>{u.unit_label || "—"}</td>
                  <td>
                    {u.approved ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Approved</span>
                    ) : u.setup_completed_at ? (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Ready for approval</span>
                    ) : u.invite_expires_at ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Setup invited</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Registration pending</span>
                    )}
                  </td>
                  <td className="text-right">
                    {u.approved
                      ? <button onClick={() => toggle(u.id, false)} className="text-sm font-semibold text-danger hover:underline">Suspend</button>
                      : u.setup_completed_at || !u.invite_expires_at
                        ? <button onClick={() => toggle(u.id, true)} className="text-sm font-semibold text-primary hover:underline">Approve</button>
                        : <span className="text-xs text-slate-400">Awaiting setup</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}