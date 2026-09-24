"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fmt } from "@/lib/currency";
import { exportToExcel, importFromExcel } from "@/lib/excel";

export type FieldType = "text" | "number" | "date" | "select" | "textarea" | "checkbox";

export interface Field {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
  step?: string;
  currency?: boolean;
  hideInTable?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
}

const PILL_GREEN = ["paid", "active", "done", "good", "refunded", "resolved"];
const PILL_BLUE = ["occupied", "in-progress", "held", "true"];
const PILL_AMBER = ["pending", "medium", "fair", "maintenance", "partially-refunded"];
const PILL_RED = ["overdue", "urgent", "high", "open", "poor", "broken", "forfeited"];

// normalize a spreadsheet header or field name for matching ("Monthly Rent" → "monthlyrent")
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function pillClass(value: unknown): string | null {
  if (value === true) return "bg-green-100 text-green-700";
  if (value === false) return "bg-slate-100 text-slate-500";
  if (typeof value !== "string" || !value) return null;
  const s = value.toLowerCase();
  if (PILL_GREEN.includes(s)) return "bg-green-100 text-green-700";
  if (PILL_BLUE.includes(s)) return "bg-blue-100 text-blue-700";
  if (PILL_AMBER.includes(s)) return "bg-amber-100 text-amber-700";
  if (PILL_RED.includes(s)) return "bg-red-100 text-red-700";
  return null;
}

function friendlyError(err: any): string {
  if (err?.code === "PGRST205")
    return "This table doesn't exist in Supabase yet. Run supabase/upgrade-admin-tables.sql in the Supabase SQL Editor, then reload this page.";
  if (/row-level|permission|jwt|not authenticated/i.test(err?.message ?? ""))
    return "Admin access required — sign in with the owner account.";
  return err?.message ?? "Something went wrong.";
}

function initialForm(fields: Field[]): Record<string, any> {
  const form: Record<string, any> = {};
  const today = new Date().toISOString().slice(0, 10);
  for (const f of fields) {
    if (f.defaultValue === "today") form[f.key] = today;
    else if (f.defaultValue !== undefined) form[f.key] = f.defaultValue;
    else if (f.type === "checkbox") form[f.key] = false;
    else if (f.type === "date") form[f.key] = today;
    else if (f.type === "select") form[f.key] = f.options?.[0] ?? "";
    else form[f.key] = "";
  }
  return form;
}

export default function AdminTable({
  table, title, subtitle, itemLabel, fields,
  orderBy, orderAsc = false, sumField, yearField, note,
}: {
  table: string;
  title: string;
  subtitle?: string;
  itemLabel: string;
  fields: Field[];
  orderBy?: string;
  orderAsc?: boolean;
  sumField?: string;   // numeric column to total in the header chip
  yearField?: string;  // date column used to build the year filter
  note?: React.ReactNode;
}) {
  const cols = fields.filter((f) => !f.hideInTable);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string | null>(orderBy ?? null);
  const [sortAsc, setSortAsc] = useState(orderAsc);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importState, setImportState] = useState<{ busy: boolean; msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = supabase.from(table).select("*").limit(2000);
    if (orderBy) q = q.order(orderBy, { ascending: orderAsc });
    const { data, error: err } = await q;
    if (err) setError(friendlyError(err));
    setRows((data as Record<string, any>[]) ?? []);
    setLoading(false);
  }, [table, orderBy, orderAsc]);

  useEffect(() => { load(); }, [load]);

  const years = useMemo(() => {
    if (!yearField) return [];
    const ys = new Set<number>();
    for (const r of rows) {
      const d = r[yearField];
      // slice the string, not Date parsing — date-only strings shift a day in
      // timezones behind UTC and would land January rows in the wrong year
      if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) ys.add(Number(d.slice(0, 4)));
    }
    return [...ys].sort((a, b) => b - a);
  }, [rows, yearField]);

  const visible = useMemo(() => {
    let out = rows;
    if (year !== "all" && yearField) {
      out = out.filter((r) =>
        typeof r[yearField] === "string" && r[yearField].slice(0, 4) === year
      );
    }
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((r) =>
        cols.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q)) ||
        String(r.id ?? "").includes(q)
      );
    }
    if (sortKey) {
      const dir = sortAsc ? 1 : -1;
      out = [...out].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (av == null) return 1 * dir;
        if (bv == null) return -1 * dir;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    return out;
  }, [rows, search, year, yearField, sortKey, sortAsc, cols]);

  const total = useMemo(
    () => (sumField ? visible.reduce((s, r) => s + Number(r[sumField] ?? 0), 0) : null),
    [visible, sumField]
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(initialForm(fields));
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: Record<string, any>) => {
    setEditingId(row.id);
    const next: Record<string, any> = {};
    for (const f of fields) next[f.key] = f.type === "checkbox" ? Boolean(row[f.key]) : (row[f.key] ?? "");
    setForm(next);
    setFormError(null);
    setShowForm(true);
  };

  const save = async () => {
    for (const f of fields) {
      if (f.required && f.type !== "checkbox" && !String(form[f.key] ?? "").trim()) {
        setFormError(`${f.label} is required`);
        return;
      }
    }
    const payload: Record<string, any> = {};
    for (const f of fields) {
      const v = form[f.key];
      if (f.type === "number") payload[f.key] = v === "" || v == null ? null : Number(v);
      else if (f.type === "checkbox") payload[f.key] = Boolean(v);
      else payload[f.key] = v === "" ? null : v;
    }
    setSaving(true);
    const { error: err } = editingId
      ? await supabase.from(table).update(payload).eq("id", editingId)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (err) { setFormError(friendlyError(err)); return; }
    setShowForm(false);
    load();
  };

  const remove = async (row: Record<string, any>) => {
    if (!window.confirm(`Delete this ${itemLabel}? This cannot be undone.`)) return;
    const { error: err } = await supabase.from(table).delete().eq("id", row.id);
    if (err) { setError(friendlyError(err)); return; }
    load();
  };

  const exportRows = () =>
    exportToExcel(
      visible.map((r) => Object.fromEntries(cols.map((c) => [c.label, r[c.key] ?? ""]))),
      table
    );

  const onImportFile = async (file: File) => {
    setImportState({ busy: true, msg: "Reading file…", ok: true });
    try {
      const raw = await importFromExcel(file);
      // accept headers that match either the field key or its label ("Full name", "fullname", …)
      const lookup = new Map<string, Field>();
      for (const f of fields) {
        lookup.set(norm(f.key), f);
        lookup.set(norm(f.label), f);
      }
      const errors: string[] = [];
      const out: Record<string, any>[] = [];
      raw.forEach((r, i) => {
        const row: Record<string, any> = {};
        let used = false;
        for (const [h, v] of Object.entries(r)) {
          const f = lookup.get(norm(h));
          if (!f) continue;
          used = true;
          if (f.type === "number") row[f.key] = v === "" || v == null ? null : Number(String(v).replace(/,/g, ""));
          else if (f.type === "checkbox")
            row[f.key] = v === true || ["yes", "true", "1"].includes(String(v).toLowerCase());
          else row[f.key] = v == null || String(v).trim() === "" ? null : String(v).trim();
        }
        if (!used) { errors.push(`row ${i + 2} has no recognized columns`); return; }
        const missing = fields.filter(
          (f) => f.required && f.type !== "checkbox" && (row[f.key] == null || row[f.key] === "")
        );
        if (missing.length) {
          errors.push(`row ${i + 2} is missing ${missing.map((f) => f.label).join(", ")}`);
          return;
        }
        out.push(row);
      });
      if (!out.length) {
        setImportState({ busy: false, ok: false, msg: `Nothing imported — ${errors.slice(0, 4).join("; ") || "no data rows found"}.` });
        return;
      }
      let done = 0;
      for (let i = 0; i < out.length; i += 200) {
        const { error } = await supabase.from(table).insert(out.slice(i, i + 200));
        if (error) {
          setImportState({ busy: false, ok: false, msg: `Import failed after ${done} rows: ${error.message}` });
          return;
        }
        done += out.slice(i, i + 200).length;
      }
      setImportState({
        busy: false, ok: true,
        msg: `✅ Imported ${done} row${done === 1 ? "" : "s"}${errors.length ? ` — skipped ${errors.length} (${errors.slice(0, 3).join("; ")})` : ""}.`,
      });
      load();
    } catch (e: any) {
      setImportState({ busy: false, ok: false, msg: "Import failed: " + (e?.message ?? "unreadable file") });
    }
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const cell = (f: Field, row: Record<string, any>) => {
    const v = row[f.key];
    if (f.type === "checkbox")
      return v ? <span className="pill-paid">Yes</span> : <span className="text-slate-300">—</span>;
    if (v == null || v === "") return <span className="text-slate-300">—</span>;
    if (f.key.includes("photo_url") && typeof v === "string" && v.startsWith("http"))
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v} alt="Photo" className="h-10 w-10 rounded-lg border border-slate-200 object-cover" />
      );
    const pill = (f.type === "select" || typeof v === "boolean") ? pillClass(v) : null;
    const text = f.currency ? fmt(Number(v)) : f.type === "textarea" ? (
      <span title={String(v)}>{String(v).length > 42 ? String(v).slice(0, 42) + "…" : String(v)}</span>
    ) : String(v);
    return pill ? (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill}`}>{String(v)}</span>
    ) : <>{text}</>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          {total !== null && (
            <p className="mt-2 text-sm font-semibold text-primary">Shown total: {fmt(total)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <label className="btn-ghost cursor-pointer">
            ⬆ Import
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              disabled={importState?.busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onImportFile(f);
              }}
            />
          </label>
          <button onClick={exportRows} className="btn-ghost" disabled={!visible.length}>⬇ Export</button>
          <button onClick={openAdd} className="btn-primary">+ Add {itemLabel}</button>
        </div>
      </div>

      {importState && (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${importState.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-danger"}`}>
          {importState.msg}
        </div>
      )}

      {note && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-primary-50 px-4 py-3 text-sm text-primary-dark">{note}</div>
      )}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="card mt-4 !p-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <input
            type="search"
            inputMode="search"
            placeholder={`Search ${itemLabel}s…`}
            className="input sm:max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={`Search ${itemLabel}s`}
          />
          {years.length > 0 && (
            <select
              className="input sm:max-w-[10rem]"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              aria-label="Filter by year"
            >
              <option value="all">All years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <p className="text-sm text-slate-400 sm:ml-auto">{visible.length} of {rows.length} records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="table-clean min-w-[640px]">
            <thead>
              <tr>
                {cols.map((f) => (
                  <th key={f.key} scope="col">
                    <button onClick={() => toggleSort(f.key)} className="inline-flex items-center gap-1 hover:text-primary">
                      {f.label}
                      {sortKey === f.key && <span aria-hidden>{sortAsc ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                ))}
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={cols.length + 1} className="py-10 text-center text-sm text-slate-500">Loading…</td></tr>
              )}
              {!loading && visible.map((row) => (
                <tr key={row.id}>
                  {cols.map((f) => <td key={f.key}>{cell(f, row)}</td>)}
                  <td className="whitespace-nowrap text-right">
                    <button onClick={() => openEdit(row)} className="text-sm font-semibold text-primary hover:underline">Edit</button>
                    <span className="mx-1.5 text-slate-200">|</span>
                    <button onClick={() => remove(row)} className="text-sm font-semibold text-danger hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && visible.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            {rows.length === 0 ? `No ${itemLabel}s yet — add the first one.` : "No records match your filters."}
          </p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lift">
            <h2 className="text-lg font-bold text-primary-dark">
              {editingId ? `Edit ${itemLabel}` : `Add ${itemLabel}`}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                  {f.type === "checkbox" ? (
                    <label className="flex min-h-[44px] items-center gap-2.5 text-sm font-medium text-slate-600">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-slate-300"
                        checked={Boolean(form[f.key])}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                      />
                      {f.label}
                    </label>
                  ) : (
                    <>
                      <label className="label" htmlFor={`fld-${f.key}`}>
                        {f.label}{f.required && <span className="text-danger"> *</span>}
                      </label>
                      {f.type === "select" ? (
                        <select
                          id={`fld-${f.key}`}
                          className="input"
                          value={form[f.key] ?? ""}
                          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        >
                          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.type === "textarea" ? (
                        <textarea
                          id={`fld-${f.key}`}
                          className="input min-h-[88px]"
                          value={form[f.key] ?? ""}
                          placeholder={f.placeholder}
                          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        />
                      ) : (
                        <input
                          id={`fld-${f.key}`}
                          className="input"
                          type={f.type ?? "text"}
                          step={f.step}
                          placeholder={f.placeholder}
                          value={form[f.key] ?? ""}
                          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            {formError && <p className="mt-3 text-sm font-medium text-danger">{formError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : `Add ${itemLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
