"use client";
import { useEffect, useState } from "react";
import AdminTable from "@/components/admin/AdminTable";

export default function LandlordPage() {
  const [form, setForm] = useState({ name: "Landlord", bio: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(({ data }) => {
      setForm({ name: data?.landlord_name ?? "Landlord", bio: data?.landlord_bio ?? "" });
      if (data?.landlord_photo) setPreview(data.landlord_photo);
    });
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const save = async () => {
    setBusy(true); setMsg("");
    const fd = new FormData();
    if (file) fd.append("file", file);
    fd.append("name", form.name);
    fd.append("bio", form.bio);
    const res = await fetch("/api/admin/landlord-photo", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) { setMsg("❌ Failed to save"); return; }
    setMsg("✅ Landlord profile saved — tenants will see this in their portal.");
  };

  return (
    <div className="space-y-8">
      <div className="card">
        <h2 className="text-lg font-bold text-primary-dark mb-1">🏠 Landlord Profile</h2>
        <p className="text-sm text-slate-500 mb-5">Upload a photo and info so tenants can see who their landlord is.</p>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center gap-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Landlord" className="h-32 w-32 rounded-2xl object-cover border-2 border-primary-100" />
            ) : (
              <div className="h-32 w-32 rounded-2xl bg-primary-50 flex items-center justify-center text-5xl">👤</div>
            )}
            <label className="btn-ghost text-xs cursor-pointer">
              📷 Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className="label">Landlord Name</label>
              <input className="input" type="text" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Landlord" />
            </div>
            <div>
              <label className="label">Short Bio / Message to Tenants</label>
              <textarea className="input min-h-[80px]" value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="e.g. Welcome to Yazkap Properties. Feel free to reach out for any concerns." />
            </div>
            {msg && <p className={`text-sm ${msg.startsWith("✅") ? "text-green-700" : "text-danger"}`}>{msg}</p>}
            <button onClick={save} disabled={busy} className="btn-primary">
              {busy ? "Saving…" : "💾 Save Landlord Profile"}
            </button>
          </div>
        </div>
      </div>

      <AdminTable
        table="landlord_payments"
        title="💳 Rent Payments to Landlord"
        subtitle="Rent paid under the landlord agreement (AED 5,800 / month)"
        itemLabel="payment"
        orderBy="date"
        sumField="amount"
        yearField="date"
        note={<>📌 Contract rate: <strong>AED 5,800 / month</strong> (AED 69,600 / year). These payments reduce net profit on Overview and Reports.</>}
        fields={[
          { key: "date", label: "Paid on", type: "date", required: true, defaultValue: "today" },
          { key: "amount", label: "Amount", type: "number", currency: true, required: true, step: "0.01", defaultValue: 5800 },
          { key: "method", label: "Method", type: "select", options: ["Cash", "Bank Transfer", "Cheque"], defaultValue: "Cash" },
          { key: "note", label: "Note", type: "text", placeholder: "e.g. January 2026 rent" },
        ]}
      />
    </div>
  );
}
