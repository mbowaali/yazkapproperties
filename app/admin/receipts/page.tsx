"use client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/currency";

export default function AdminReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

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
      <p className="mt-1 text-sm text-slate-500">Approve tenant receipt requests — once approved, tenants can download a printable receipt.</p>
      {pending > 0 && <div className="mt-3 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{pending} pending approval</div>}
      {msg && <p className={`mt-3 text-sm font-medium ${msg.startsWith("✅") ? "text-green-700" : "text-slate-600"}`}>{msg}</p>}

      <div className="card mt-4 !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[700px]">
            <thead>
              <tr><th>Tenant</th><th>Email</th><th>Date</th><th>Amount</th><th>Method</th><th>Description</th><th>Status</th><th className="text-right">Action</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-500">Loading…</td></tr>}
              {!loading && receipts.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-500">No receipt requests yet.</td></tr>}
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.tenant_name}</td>
                  <td className="text-slate-500 text-xs">{r.tenant_email}</td>
                  <td>{r.payment_date?.slice(0, 10)}</td>
                  <td className="font-semibold">{fmt(r.amount)}</td>
                  <td>{r.payment_method || "—"}</td>
                  <td className="max-w-[160px] truncate">{r.description || "—"}</td>
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
    </div>
  );
}
