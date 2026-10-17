"use client";
import { useEffect, useState } from "react";
import { ALL_PERMISSIONS, groupPermissions } from "@/lib/permissions";

const GROUPS = groupPermissions();

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null); // null=list, {}=new, {id,...}=edit
  const [form, setForm] = useState({ email: "", full_name: "", phone: "", password: "", permissions: [] as string[] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/employees").then(r => r.json()).then(({ data }) => {
      setEmployees(data ?? []);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ email: "", full_name: "", phone: "", password: "", permissions: [] });
    setEditing({});
    setMsg("");
  };

  const openEdit = (emp: any) => {
    setForm({ email: emp.email, full_name: emp.full_name, phone: emp.phone || "", password: "", permissions: emp.permissions || [] });
    setEditing(emp);
    setMsg("");
  };

  const togglePerm = (key: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter(p => p !== key) : [...f.permissions, key],
    }));
  };

  const save = async () => {
    setBusy(true); setMsg("");
    const isNew = !editing?.id;
    let res: Response;
    try {
      res = await fetch("/api/admin/employees", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? form : { id: editing.id, ...form }),
      });
    } catch {
      setBusy(false);
      setMsg("❌ Network error. Please try again.");
      return;
    }
    let json: { error?: string };
    try {
      json = await res.json();
    } catch {
      setBusy(false);
      setMsg(`❌ Server error (${res.status}). Please try again.`);
      return;
    }
    setBusy(false);
    if (!res.ok || json.error) { setMsg("❌ " + (json.error || "Failed")); return; }
    setMsg("✅ Saved");
    load();
    setTimeout(() => { setEditing(null); setMsg(""); }, 800);
  };

  const deactivate = async (id: number) => {
    if (!confirm("Deactivate this employee?")) return;
    await fetch("/api/admin/employees", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  if (editing !== null) {
    const isNew = !editing?.id;
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(null)} className="btn-ghost !min-h-0 px-3 py-1.5 text-sm">← Back</button>
          <h1 className="text-xl font-bold text-primary-dark">{isNew ? "➕ Add Employee" : `✏️ Edit — ${editing.full_name}`}</h1>
        </div>

        {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-danger"}`}>{msg}</p>}

        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-700">Account Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" disabled={!isNew} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+971 50 000 0000" />
            </div>
            <div>
              <label className="label">{isNew ? "Password *" : "New Password (leave blank to keep)"}</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">🔐 Permissions</h2>
            <div className="flex gap-2">
              <button onClick={() => setForm(f => ({ ...f, permissions: ALL_PERMISSIONS.map(p => p.key) }))} className="text-xs font-semibold text-primary hover:underline">Select All</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => setForm(f => ({ ...f, permissions: [] }))} className="text-xs font-semibold text-slate-500 hover:underline">Clear All</button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Only grant what this employee needs. You can change this anytime.</p>
          {Object.entries(GROUPS).map(([group, perms]) => (
            <div key={group}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{group}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {perms.map(p => (
                  <label key={p.key} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition ${
                    form.permissions.includes(p.key) ? "border-primary bg-primary-50" : "border-slate-200 hover:border-primary-200"
                  }`}>
                    <input type="checkbox" className="accent-primary" checked={form.permissions.includes(p.key)} onChange={() => togglePerm(p.key)} />
                    <span className="text-sm text-slate-700">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setEditing(null)} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-primary flex-1">{busy ? "Saving…" : "💾 Save Employee"}</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">👥 Employees</h1>
          <p className="mt-1 text-sm text-slate-500">Add staff and control exactly what each person can access.</p>
        </div>
        <button onClick={openNew} className="btn-primary">➕ Add Employee</button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map(emp => (
          <div key={emp.id} className={`card space-y-3 ${!emp.approved ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-800">{emp.full_name}</p>
                <p className="text-xs text-slate-500">{emp.email}</p>
                {emp.phone && <p className="text-xs text-slate-400">{emp.phone}</p>}
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${emp.approved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {emp.approved ? "Active" : "Inactive"}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1.5">PERMISSIONS ({emp.permissions?.length ?? 0})</p>
              <div className="flex flex-wrap gap-1">
                {(emp.permissions ?? []).slice(0, 6).map((p: string) => (
                  <span key={p} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary font-medium">{p.replace(/_/g, " ")}</span>
                ))}
                {(emp.permissions?.length ?? 0) > 6 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">+{emp.permissions.length - 6} more</span>
                )}
                {(emp.permissions?.length ?? 0) === 0 && <span className="text-xs text-slate-400 italic">No permissions yet</span>}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => openEdit(emp)} className="btn-ghost flex-1 text-sm !min-h-0 py-2">✏️ Edit</button>
              {emp.approved && (
                <button onClick={() => deactivate(emp.id)} className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-danger hover:bg-red-100 transition">Deactivate</button>
              )}
            </div>
          </div>
        ))}
        {!loading && employees.length === 0 && (
          <div className="col-span-3 card py-12 text-center">
            <p className="text-slate-500 text-sm">No employees yet. Add your first team member.</p>
          </div>
        )}
      </div>
    </div>
  );
}
