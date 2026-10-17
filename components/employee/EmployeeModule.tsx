"use client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/currency";

export type EmployeeField = {
  key: string; label: string; type?: "text" | "number" | "date" | "month" | "select" | "textarea" | "checkbox";
  options?: string[]; required?: boolean; currency?: boolean; hideInTable?: boolean; defaultValue?: string | number | boolean;
};

type Module = {
  title: string; table: string; description: string; orderBy: string;
  fields: EmployeeField[]; canCreate?: boolean; canEdit?: boolean; requestReplies?: boolean; receiptActions?: boolean;
};

function initialForm(fields: EmployeeField[], row?: Record<string, any>) {
  const values: Record<string, any> = {};
  for (const field of fields) {
    const value = row?.[field.key];
    if (value !== undefined) values[field.key] = field.type === "month" && value ? String(value).slice(0, 7) : value;
    else if (field.defaultValue === "today") values[field.key] = new Date().toISOString().slice(0, 10);
    else if (field.defaultValue !== undefined) values[field.key] = field.defaultValue;
    else values[field.key] = field.type === "checkbox" ? false : "";
  }
  return values;
}

export default function EmployeeModule({ module }: { module: Module }) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [replyRow, setReplyRow] = useState<Record<string, any> | null>(null);
  const [reply, setReply] = useState("");

  const load = async () => {
    setLoading(true);
    const response = await fetch(`/api/employee/data?table=${encodeURIComponent(module.table)}`);
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Could not load this module.");
    else { setRows(result.data ?? []); setError(""); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [module.table]);

  const visibleFields = module.fields.filter(field => !field.hideInTable);
  const visible = rows.filter(row => visibleFields.some(field => String(row[field.key] ?? "").toLowerCase().includes(search.toLowerCase())));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload: Record<string, any> = {};
    for (const field of module.fields) {
      let value = form[field.key];
      if (field.type === "month" && value) value = `${value}-01`;
      if (field.type === "number") value = value === "" ? null : Number(value);
      if (field.type === "checkbox") value = Boolean(value);
      if (value === "") value = null;
      payload[field.key] = value;
    }
    let response: Response;
    try {
      response = await fetch("/api/employee/data", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { table: module.table, id: editing, payload } : { table: module.table, payload }),
      });
    } catch {
      setBusy(false);
      setError("Network error. Please try again.");
      return;
    }
    let result: { error?: string };
    try {
      result = await response.json();
    } catch {
      setBusy(false);
      setError(`Server error (${response.status}). Please try again.`);
      return;
    }
    setBusy(false);
    if (!response.ok) { setError(result.error ?? "Could not save changes."); return; }
    setShowForm(false);
    setEditing(null);
    await load();
  };

  const saveReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!replyRow) return;
    setBusy(true);
    setError("");
    let response: Response;
    try {
      response = await fetch("/api/employee/data", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "tenant_requests", id: replyRow.id, payload: { status: "in-progress", admin_reply: reply.trim() } }),
      });
    } catch {
      setBusy(false);
      setError("Network error. Please try again.");
      return;
    }
    let result: { error?: string };
    try {
      result = await response.json();
    } catch {
      setBusy(false);
      setError(`Server error (${response.status}). Please try again.`);
      return;
    }
    setBusy(false);
    if (!response.ok) { setError(result.error ?? "Could not send the reply."); return; }
    setReplyRow(null);
    setReply("");
    await load();
  };

  const changeReceiptStatus = async (row: Record<string, any>, status: string) => {
    const response = await fetch("/api/employee/data", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "receipts", id: row.id, payload: { status } }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Could not update receipt status.");
    else await load();
  };

  const renderValue = (field: EmployeeField, row: Record<string, any>) => {
    const value = row[field.key];
    if (value == null || value === "") return "—";
    if (field.currency) return fmt(Number(value));
    if (field.type === "checkbox") return value ? "Yes" : "No";
    if ((field.type === "date" || field.type === "month") && String(value).includes("T")) return String(value).slice(0, 10);
    return String(value);
  };

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase text-primary">Employee workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-primary-dark">{module.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{module.description}</p>
      </header>
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <input className="input sm:max-w-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${module.title.toLowerCase()}…`} />
        {module.canCreate && <button className="btn-primary" onClick={() => { setForm(initialForm(module.fields)); setEditing(null); setShowForm(true); }}>Add record</button>}
        <span className="self-center text-xs text-slate-500">{visible.length} records</span>
      </div>

      {showForm && (
        <form className="card space-y-4" onSubmit={save}>
          <h2 className="font-semibold text-primary-dark">{editing ? "Edit record" : "Add record"}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {module.fields.map(field => (
              <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                {field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(form[field.key])} onChange={event => setForm({ ...form, [field.key]: event.target.checked })} />{field.label}</label>
                ) : (
                  <>
                    <label className="label" htmlFor={`employee-${field.key}`}>{field.label}{field.required ? " *" : ""}</label>
                    {field.type === "select" ? (
                      <select id={`employee-${field.key}`} className="input" value={form[field.key] ?? ""} onChange={event => setForm({ ...form, [field.key]: event.target.value })}>
                        <option value="">Select</option>{field.options?.map(option => <option key={option}>{option}</option>)}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea id={`employee-${field.key}`} className="input min-h-20" value={form[field.key] ?? ""} onChange={event => setForm({ ...form, [field.key]: event.target.value })} />
                    ) : (
                      <input id={`employee-${field.key}`} className="input" type={field.type ?? "text"} step={field.type === "number" ? "0.01" : undefined} required={field.required} value={form[field.key] ?? ""} onChange={event => setForm({ ...form, [field.key]: event.target.value })} />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
        </form>
      )}

      {replyRow && (
        <form className="card space-y-3" onSubmit={saveReply}>
          <h2 className="font-semibold text-primary-dark">Reply to: {replyRow.subject}</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{replyRow.message}</p>
          <label className="label" htmlFor="employee-request-reply">Reply</label>
          <textarea id="employee-request-reply" className="input min-h-24" value={reply} onChange={event => setReply(event.target.value)} required />
          <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => setReplyRow(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? "Sending…" : "Send reply"}</button></div>
        </form>
      )}

      <section className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[720px]">
            <thead><tr>{visibleFields.map(field => <th key={field.key}>{field.label}</th>)}{(module.canEdit || module.requestReplies || module.receiptActions) && <th className="text-right">Actions</th>}</tr></thead>
            <tbody>
              {loading && <tr><td colSpan={visibleFields.length + 1} className="py-10 text-center text-sm text-slate-500">Loading…</td></tr>}
              {!loading && visible.length === 0 && <tr><td colSpan={visibleFields.length + 1} className="py-10 text-center text-sm text-slate-500">No records available.</td></tr>}
              {visible.map(row => (
                <tr key={row.id}>
                  {visibleFields.map(field => <td key={field.key}>{renderValue(field, row)}</td>)}
                  {(module.canEdit || module.requestReplies || module.receiptActions) && <td className="whitespace-nowrap text-right">
                    {module.canEdit && <button className="font-semibold text-primary hover:underline" onClick={() => { setForm(initialForm(module.fields, row)); setEditing(row.id); setShowForm(true); }}>Edit</button>}
                    {module.requestReplies && <button className="font-semibold text-primary hover:underline" onClick={() => { setReplyRow(row); setReply(row.admin_reply ?? ""); }}>Reply</button>}
                    {module.receiptActions && <select className="input !min-h-0 py-1 text-xs" value={row.status} aria-label={`Receipt ${row.id} status`} onChange={event => changeReceiptStatus(row, event.target.value)}><option value="pending">Pending</option><option value="approved">Approve</option><option value="rejected">Reject</option></select>}
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}