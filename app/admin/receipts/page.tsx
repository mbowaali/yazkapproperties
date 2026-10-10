"use client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/currency";

export default function AdminReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<any>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/receipts").then(r => r.json()).then(({ data }) => {
      setReceipts(data ?? []);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: number, status: "approved" | "rejected") => {
    setMsg("");
    await fetch("/api/admin/receipts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setMsg(status === "approved" ? "✅ Receipt approved — tenant can now download it." : "Receipt rejected.");
    load();
  };

  const pending = receipts.filter(r => r.status === "pending").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary-dark">🖨 Receipt Approvals</h1>
      <p className="mt-1 text-sm text-slate-500">Review tenant payment evidence and approve receipts.</p>
      {pending > 0 && <div className="mt-3 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{pending} pending approval</div>}
      {msg && <p className={`mt-3 text-sm font-medium ${msg.startsWith("✅") ? "text-green-700" : "text-slate-600"}`}>{msg}</p>}

      <div className="card mt-4 !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[860px]">
            <thead>
              <tr>
                <th>Tenant</th><th>Date</th><th>Amount</th><th>Method</th>
                <th>Bank</th><th>Ref No.</th><th>Description</th>
                <th>Evidence</th><th>Status</th><th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="py-10 text-center text-sm text-slate-500">Loading…</td></tr>}
              {!loading && receipts.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-sm text-slate-500">No receipt requests yet.</td></tr>}
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="font-medium">{r.tenant_name}</p>
                    <p className="text-xs text-slate-400">{r.tenant_email}</p>
                  </td>
                  <td>{r.payment_date?.slice(0, 10)}</td>
                  <td className="font-semibold">{fmt(r.amount)}</td>
                  <td>{r.payment_method || "—"}</td>
                  <td className="text-sm">{r.bank_name || "—"}</td>
                  <td className="text-sm font-mono">{r.transaction_ref || "—"}</td>
                  <td className="max-w-[140px] truncate text-sm">{r.description || "—"}</td>
                  <td>
                    {r.evidence_url ? (
                      <button onClick={() => setPreview(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                        🖼 View
                      </button>
                    ) : <span className="text-xs text-slate-400">None</span>}
                  </td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      r.status === "approved" ? "bg-green-100 text-green-700" :
                      r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>{r.status}</span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => approve(r.id, "approved")} className="text-sm font-semibold text-success hover:underline">Approve</button>
                        <span className="mx-1.5 text-slate-200">|</span>
                        <button onClick={() => approve(r.id, "rejected")} className="text-sm font-semibold text-danger hover:underline">Reject</button>
                      </>
                    )}
                    {r.status !== "pending" && <span className="text-xs text-slate-400">Done</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-lift" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800">Payment Evidence</h3>
                <p className="text-xs text-slate-500">{preview.tenant_name} · {preview.payment_date?.slice(0, 10)} · {fmt(preview.amount)}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              {[
                ["Method", preview.payment_method],
                ["Bank", preview.bank_name],
                ["Transaction Ref", preview.transaction_ref],
                ["Description", preview.description],
              ].map(([label, val]) => val ? (
                <div key={label as string} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="font-medium text-slate-700">{val}</p>
                </div>
              ) : null)}
            </div>

            {preview.evidence_url?.startsWith("data:image") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.evidence_url} alt="Payment evidence" className="w-full rounded-xl border border-slate-200 max-h-80 object-contain" />
            ) : preview.evidence_url?.startsWith("data:application/pdf") ? (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 text-center">📄 PDF document — <a href={preview.evidence_url} download={preview.evidence_name} className="text-primary font-semibold hover:underline">Download</a></p>
            ) : null}

            {preview.status === "pending" && (
              <div className="flex gap-2 mt-4">
                <button onClick={() => { approve(preview.id, "rejected"); setPreview(null); }} className="btn-ghost flex-1 text-danger">Reject</button>
                <button onClick={() => { approve(preview.id, "approved"); setPreview(null); }} className="btn-primary flex-1">✅ Approve</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
