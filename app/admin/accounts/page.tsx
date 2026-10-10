"use client";
import { useEffect, useState } from "react";

type User = { id: number; email: string; full_name: string | null; phone: string | null; emirates_id: string | null; employer: string | null; role: string; approved: boolean; created_at: string };

export default function AccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = () =>
    fetch("/api/admin/users").then(r => r.json()).then(({ data }) => {
      setUsers(data ?? []);
      setLoading(false);
    });

  useEffect(() => { load(); }, []);

  const toggle = async (id: number, approved: boolean) => {
    setMsg("");
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approved }),
    });
    setMsg(approved ? "✅ Account approved." : "Account suspended.");
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary-dark">👤 Tenant Accounts</h1>
      <p className="mt-1 text-sm text-slate-500">Approve or suspend tenant portal access</p>
      {msg && <p className="mt-3 text-sm font-medium text-green-700">{msg}</p>}
      <div className="card mt-4 !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[640px]">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Employer</th><th>Status</th><th className="text-right">Action</th>
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
                  <td>{u.employer || "—"}</td>
                  <td>
                    {u.approved
                      ? <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Approved</span>
                      : <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Pending</span>}
                  </td>
                  <td className="text-right">
                    {u.approved
                      ? <button onClick={() => toggle(u.id, false)} className="text-sm font-semibold text-danger hover:underline">Suspend</button>
                      : <button onClick={() => toggle(u.id, true)} className="text-sm font-semibold text-primary hover:underline">Approve</button>}
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
