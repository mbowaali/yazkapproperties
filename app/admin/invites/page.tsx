"use client";
import { useEffect, useState } from "react";

interface Invite {
  id: number;
  user_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  expires_at: string;
  completed_at: string | null;
  created_at: string;
  created_by_name: string | null;
}

type InviteStatus = "pending" | "completed" | "expired";

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InviteStatus>("all");
  const [stats, setStats] = useState({ total: 0, pending: 0, expired: 0, completed: 0 });

  useEffect(() => {
    const loadInvites = async () => {
      try {
        const response = await fetch("/api/admin/tenants/invites/status");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load tenant invites.");
        }
        setInvites(data.invites ?? []);
        setStats(data.stats ?? { total: 0, pending: 0, expired: 0, completed: 0 });
      } catch (error) {
        console.error("Failed to load invites:", error);
        setError(error instanceof Error ? error.message : "Failed to load tenant invites.");
      } finally {
        setLoading(false);
      }
    };

    loadInvites();
  }, []);

  const getStatus = (invite: Invite): InviteStatus => {
    if (invite.completed_at) return "completed";
    return new Date(invite.expires_at) > new Date() ? "pending" : "expired";
  };

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleInvites = invites.filter(invite => {
    const matchesSearch = !normalizedSearch || [
      invite.full_name,
      invite.email,
      invite.phone,
      invite.created_by_name,
    ].some(value => value?.toLocaleLowerCase().includes(normalizedSearch));
    return matchesSearch && (statusFilter === "all" || getStatus(invite) === statusFilter);
  });

  if (loading) {
    return <div className="p-8 text-center">Loading invites...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
          <p className="text-sm text-blue-600">Total Invites</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
          <p className="text-sm text-amber-600">Pending</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
          <p className="text-sm text-green-600">Completed</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-2xl font-bold text-red-700">{stats.expired}</p>
          <p className="text-sm text-red-600">Expired</p>
        </div>
      </div>

      <section>
        <h1 className="text-2xl font-bold text-primary-dark">📨 Tenant Account Invites</h1>
        <p className="mt-1 text-sm text-slate-500">Track all tenant account setup invitations.</p>
        {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            inputMode="search"
            className="input sm:max-w-sm"
            placeholder="Type a tenant name to search…"
            aria-label="Search invites by tenant name, email, phone, or sender"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <select
            className="input sm:max-w-xs"
            aria-label="Filter tenant invites by status"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as "all" | InviteStatus)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div className="card mt-4 !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-clean min-w-[900px]">
              <thead>
                <tr>
                  <th>Tenant</th><th>Email</th><th>Phone</th><th>Status</th>
                  <th>Created</th><th>Expires</th><th>Completed</th><th>Sent By</th>
                </tr>
              </thead>
              <tbody>
                {visibleInvites.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-slate-500">
                      {invites.length === 0 ? "No tenant invites yet." : "No invites match your search."}
                    </td>
                  </tr>
                ) : visibleInvites.map(invite => {
                  const status = getStatus(invite);
                  return (
                    <tr key={invite.id}>
                      <td className="font-medium">{invite.full_name || "—"}</td>
                      <td>{invite.email || "—"}</td>
                      <td>{invite.phone || "—"}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          status === "completed" ? "bg-green-100 text-green-700" :
                          status === "expired" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>{status}</span>
                      </td>
                      <td>{invite.created_at?.slice(0, 10) || "—"}</td>
                      <td>{invite.expires_at?.slice(0, 10) || "—"}</td>
                      <td>{invite.completed_at?.slice(0, 10) || "—"}</td>
                      <td>{invite.created_by_name || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Showing {visibleInvites.length} of {invites.length} invites
          </p>
        </div>
      </section>
    </div>
  );
}