"use client";
import { useMemo, useState } from "react";

export default function SearchTable({ columns, rows, exportFn }: {
  columns: string[]; rows: Record<string, any>[]; exportFn?: (rows: any[]) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(q)));
  }, [rows, search]);

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            inputMode="search"
            placeholder="Search records…"
            className="input !pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search records"
          />
        </div>
        {exportFn && (
          <button onClick={() => exportFn(filteredRows)} className="btn-accent shrink-0">
            ⬇ Export
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="table-clean min-w-[640px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col}>{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-slate-500">No records found</p>
      )}
    </div>
  );
}
