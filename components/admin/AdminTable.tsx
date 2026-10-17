"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateAndDownloadReceipt } from "@/lib/receipts";
import { fmt } from "@/lib/currency";
import { exportToExcel, importFromExcel } from "@/lib/excel";

declare const jsPDF: any;
declare const autoTable: any;

export type FieldType = "text" | "number" | "date" | "select" | "textarea" | "checkbox" | "photo";

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

export interface BulkAction {
  id: string;
  label: string;
  description: string;
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

export const downloadReceipt = async (invoiceId: number) => {
  try {
    const response = await fetch(`/api/admin/invoices/${invoiceId}/receipt`);
    if (!response.ok) {
      throw new Error("Failed to fetch receipt data");
    }
    const { invoice, items } = await response.json();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add header with company branding
    doc.setFillColor(30, 64, 175); // Deep blue primary color
    doc.rect(0, 0, pageWidth, 45, "F");
    
    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Yazkap Properties", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Premium Property Management Solutions", pageWidth / 2, 33, { align: "center" });
    
    // Receipt title badge
    doc.setFillColor(22, 163, 74); // Green for success
    doc.roundedRect(pageWidth - 60, 15, 50, 18, 3, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PAID", pageWidth - 35, 27, { align: "center" });

    // Receipt metadata section
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RECEIPT", 14, 60);
    doc.setFont("helvetica", "normal");
    
    // Receipt number and dates
    doc.text(`Receipt #: ${invoice.invoice_no}`, 14, 68);
    doc.text(`Issue Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 75);
    if (invoice.paid_at) {
      doc.text(`Payment Date: ${new Date(invoice.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 82);
    }

    // Billed to section with background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 90, pageWidth - 28, 45, 4, "F");
    
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, 102);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.tenant_name || "Tenant Name", 20, 110);
    doc.text(`Unit: ${invoice.unit_name || "Property Unit"}`, 20, 118);
    if (invoice.tenant_email) {
      doc.text(invoice.tenant_email, 20, 126);
    }

    // Payment items table
    autoTable(doc, {
      startY: 145,
      head: [["Description", "Quantity", "Unit Price", "Total"]],
      body: items.map((item: any) => [
        item.description,
        item.quantity || 1,
        `AED ${(item.amount / (item.quantity || 1)).toFixed(2)}`,
        `AED ${item.amount.toFixed(2)}`
      ]),
      theme: "grid",
      headStyles: { 
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      foot: [
        [
          { content: "", colSpan: 3 },
          { content: "Subtotal", styles: { fontStyle: 'bold' } }
        ],
        [
          { content: "", colSpan: 3 },
          { content: `AED ${invoice.total.toFixed(2)}`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: "", colSpan: 3 },
          { content: "Amount Paid", styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } }
        ],
        [
          { content: "", colSpan: 3 },
          { content: `AED ${invoice.amount_paid?.toFixed(2) || invoice.total.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } }
        ],
        [
          { content: "", colSpan: 3 },
          { content: "Balance", styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } }
        ],
        [
          { content: "", colSpan: 3 },
          { 
            content: `AED ${(invoice.total - (invoice.amount_paid || invoice.total)).toFixed(2)}`, 
            styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } 
          }
        ]
      ],
      footStyles: { halign: 'right' }
    });

    // Add footer with contact information
    const footerY = pageHeight - 30;
    doc.setFillColor(241, 245, 249);
    doc.rect(0, footerY, pageWidth, 30, "F");
    
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(9);
    doc.text("Yazkap Properties | 123 Business Avenue, Dubai, UAE", pageWidth / 2, footerY + 10, { align: "center" });
    doc.text("contact@yazkapproperties.com | +971 4 123 4567 | www.yazkapproperties.com", pageWidth / 2, footerY + 17, { align: "center" });
    doc.text("Thank you for your business!", pageWidth / 2, footerY + 24, { align: "center" });

    // Save the PDF
    doc.save(`Yazkap-Receipt-${invoice.invoice_no}.pdf`);

  } catch (error) {
    console.error("Error generating receipt:", error);
    alert("Failed to generate receipt. Please check the console for details.");
  }
};

export default function AdminTable({
  table, title, subtitle, itemLabel, fields,
  orderBy, orderAsc = false, sumField, yearField, note, extraRowAction, filterFields, bulkActions, onBulkAction,
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
  extraRowAction?: (row: Record<string, any>) => React.ReactNode;
  filterFields?: Field[];
  bulkActions?: BulkAction[];
  onBulkAction?: (actionId: string, selectedIds: number[]) => void;
}) {
  const cols = fields.filter((f) => !f.hideInTable);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string>("all");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(orderBy ?? null);
  const [sortAsc, setSortAsc] = useState(orderAsc);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importState, setImportState] = useState<{ busy: boolean; msg: string; ok: boolean } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r: any) => r.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ table, limit: "2000" });
    if (orderBy) { params.set("orderBy", orderBy); params.set("orderAsc", String(orderAsc)); }
    const res = await fetch(`/api/db?${params}`);
    const json = await res.json();
    if (json.error) setError(json.error);
    setRows((json.data as Record<string, any>[]) ?? []);
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

    const activeFilters = Object.keys(filterValues);
    if (activeFilters.length > 0) {
      out = out.filter(r => {
        return activeFilters.every(key => {
          return r[key] === filterValues[key];
        });
      });
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
  }, [rows, search, year, yearField, sortKey, sortAsc, cols, filterValues]);

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
      if (f.type === "photo") continue; // handled below (File or kept URL)
      if (f.type === "number") payload[f.key] = v === "" || v == null ? null : Number(v);
      else if (f.type === "checkbox") payload[f.key] = Boolean(v);
      else payload[f.key] = v === "" ? null : v;
    }
    setSaving(true);
    setFormError("");
    // photo fields: keep existing URL or skip File (no storage in Vercel Postgres)
    for (const f of fields) {
      if (f.type !== "photo") continue;
      const v = form[f.key];
      payload[f.key] = typeof v === "string" && v !== "" ? v : null;
    }
    const method = editingId ? "PUT" : "POST";
    const body = editingId ? { table, id: editingId, payload } : { table, payload };
    let res: Response;
    try {
      res = await fetch("/api/db", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } catch {
      setFormError("Network error. Please try again.");
      setSaving(false);
      return;
    }
    let json: { error?: string };
    try {
      json = await res.json();
    } catch {
      setFormError(`Server error (${res.status}). Please try again.`);
      setSaving(false);
      return;
    }
    setSaving(false);
    if (!res.ok || json.error) { setFormError(json.error ?? `Save failed (${res.status})`); return; }
    setShowForm(false);
    load();
  };

  const remove = async (row: Record<string, any>) => {
    if (!window.confirm(`Delete this ${itemLabel}? This cannot be undone.`)) return;
    const res = await fetch("/api/db", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id: row.id }),
    });
    const json = await res.json();
    if (json.error) { setError(json.error); return; }
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
        const chunk = out.slice(i, i + 200);
        // Insert one by one for bulk import
        for (const row of chunk) {
          const res = await fetch("/api/db", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ table, payload: row }),
          });
          const json = await res.json();
          if (json.error) {
            setImportState({ busy: false, ok: false, msg: `Import failed after ${done} rows: ${json.error}` });
            return;
          }
          done++;
        }
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
        {selectedIds.length > 0 && bulkActions && onBulkAction && (
          <div className="p-4 border-b border-slate-100 bg-blue-50 flex items-center justify-between">
            <p className="text-blue-700">
              <strong>{selectedIds.length}</strong> item{selectedIds.length !== 1 ? 's' : ''} selected
            </p>
            <div className="relative">
              <button
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Bulk Actions ▾
              </button>
              {showBulkMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-10">
                  {bulkActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => {
                        onBulkAction(action.id, selectedIds);
                        setSelectedIds([]);
                        setShowBulkMenu(false);
                      }}
                      className="w-full text-left p-3 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <p className="font-medium">{action.label}</p>
                      <p className="text-xs text-slate-500">{action.description}</p>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSelectedIds([]);
                      setShowBulkMenu(false);
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 text-red-600"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
        {filterFields && (
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
            {filterFields.map(field => (
              <select
                key={field.key}
                className="input sm:max-w-xs"
                value={filterValues[field.key] || ""}
                onChange={(e) => {
                  const newFilters = { ...filterValues };
                  if (e.target.value) {
                    newFilters[field.key] = e.target.value;
                  } else {
                    delete newFilters[field.key];
                  }
                  setFilterValues(newFilters);
                }}
              >
                <option value="">All {field.label}</option>
                {field.options?.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table-clean min-w-[640px]">
            <thead>
              <tr>
                {bulkActions && onBulkAction && (
                  <th scope="col">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === rows.length && rows.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                )}
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
                  {bulkActions && onBulkAction && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                  )}
                  {cols.map((f) => <td key={f.key}>{cell(f, row)}</td>)}
                  <td className="whitespace-nowrap text-right">
                    {extraRowAction?.(row)}
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
                  ) : f.type === "photo" ? (
                    <div className="flex items-center gap-3">
                      {typeof form[f.key] === "string" && form[f.key] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form[f.key]} alt="Current photo" className="h-14 w-14 rounded-xl border border-slate-200 object-cover" />
                      ) : form[f.key] instanceof File ? (
                        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-50 text-xs font-semibold text-green-700">
                          Ready
                        </span>
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-300" aria-hidden>👤</span>
                      )}
                      <label className="btn-ghost cursor-pointer text-sm">
                        Choose photo…
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) setForm({ ...form, [f.key]: file });
                          }}
                        />
                      </label>
                    </div>
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