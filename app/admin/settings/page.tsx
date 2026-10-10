"use client";
import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [form, setForm] = useState({ name: "Mbowaali", bio: "", landlord_name: "Ahmed Nady", landlord_bio: "" });
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [adminPreview, setAdminPreview] = useState("");
  const [landlordFile, setLandlordFile] = useState<File | null>(null);
  const [landlordPreview, setLandlordPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(({ data }) => {
      setForm({
        name: data?.admin_name ?? "Mbowaali",
        bio: data?.admin_bio ?? "",
        landlord_name: data?.landlord_name ?? "Ahmed Nady",
        landlord_bio: data?.landlord_bio ?? "",
      });
      if (data?.admin_photo) setAdminPreview(data.admin_photo);
      if (data?.landlord_photo) setLandlordPreview(data.landlord_photo);
    });
  }, []);

  const pickFile = (setter: (f: File) => void, previewSetter: (s: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setter(f);
      const reader = new FileReader();
      reader.onload = ev => previewSetter(ev.target?.result as string);
      reader.readAsDataURL(f);
    };

  const saveAdmin = async () => {
    setBusy(true); setMsg("");
    const fd = new FormData();
    if (adminFile) fd.append("file", adminFile);
    fd.append("name", form.name);
    fd.append("bio", form.bio);
    fd.append("key_prefix", "admin");
    const res = await fetch("/api/admin/landlord-photo", { method: "POST", body: fd });
    // Also save admin_name / admin_bio via settings API
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_name: form.name, admin_bio: form.bio }),
    });
    if (adminFile) {
      // store as admin_photo key
      const buf = await adminFile.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const dataUrl = `data:${adminFile.type};base64,${b64}`;
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_photo: dataUrl }),
      });
    }
    setBusy(false);
    if (!res.ok) { setMsg("❌ Failed to save"); return; }
    setMsg("✅ Your profile saved — tenants will see your photo and name.");
  };

  const saveLandlord = async () => {
    setBusy(true); setMsg("");
    const fd = new FormData();
    if (landlordFile) fd.append("file", landlordFile);
    fd.append("name", form.landlord_name);
    fd.append("bio", form.landlord_bio);
    const res = await fetch("/api/admin/landlord-photo", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) { setMsg("❌ Failed to save"); return; }
    setMsg("✅ Landlord profile saved.");
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">⚙️ Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your profile photo and the landlord portal profile.</p>
      </div>

      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-danger"}`}>
          {msg}
        </p>
      )}

      {/* ── YOUR PROFILE (shown to tenants) ── */}
      <div className="card">
        <h2 className="text-base font-bold text-primary-dark mb-1">👤 Your Profile (shown to tenants)</h2>
        <p className="text-sm text-slate-500 mb-5">
          Tenants see your photo and name in their dashboard so they know who manages the property.
        </p>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center gap-3 shrink-0">
            {adminPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={adminPreview} alt="Your photo" className="h-32 w-32 rounded-2xl object-cover border-2 border-primary-200 shadow" />
            ) : (
              <div className="h-32 w-32 rounded-2xl bg-primary-50 flex items-center justify-center text-5xl border-2 border-dashed border-primary-200">👤</div>
            )}
            <label className="btn-ghost text-xs cursor-pointer">
              📷 {adminPreview ? "Change Photo" : "Upload Photo"}
              <input type="file" accept="image/*" className="hidden" onChange={pickFile(setAdminFile, setAdminPreview)} />
            </label>
            {adminFile && <p className="text-xs text-green-600 font-medium">✅ {adminFile.name}</p>}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className="label">Your Name</label>
              <input className="input" type="text" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
            </div>
            <div>
              <label className="label">Message to Tenants</label>
              <textarea className="input min-h-[80px]" value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="e.g. Hi, I'm your property manager. Feel free to reach out anytime." />
            </div>
            <button onClick={saveAdmin} disabled={busy} className="btn-primary">
              {busy ? "Saving…" : "💾 Save My Profile"}
            </button>
          </div>
        </div>
      </div>

      {/* ── LANDLORD PROFILE (Ahmed Nady) ── */}
      <div className="card">
        <h2 className="text-base font-bold text-primary-dark mb-1">🏠 Building Landlord Profile (Ahmed Nady)</h2>
        <p className="text-sm text-slate-500 mb-5">
          Also shown to tenants. This is the building owner, separate from you as the manager.
        </p>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center gap-3 shrink-0">
            {landlordPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={landlordPreview} alt="Landlord" className="h-32 w-32 rounded-2xl object-cover border-2 border-slate-200 shadow" />
            ) : (
              <div className="h-32 w-32 rounded-2xl bg-slate-50 flex items-center justify-center text-5xl border-2 border-dashed border-slate-200">🏠</div>
            )}
            <label className="btn-ghost text-xs cursor-pointer">
              📷 {landlordPreview ? "Change Photo" : "Upload Photo"}
              <input type="file" accept="image/*" className="hidden" onChange={pickFile(setLandlordFile, setLandlordPreview)} />
            </label>
            {landlordFile && <p className="text-xs text-green-600 font-medium">✅ {landlordFile.name}</p>}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className="label">Landlord Name</label>
              <input className="input" type="text" value={form.landlord_name}
                onChange={e => setForm(f => ({ ...f, landlord_name: e.target.value }))} placeholder="Ahmed Nady" />
            </div>
            <div>
              <label className="label">Bio / Note</label>
              <textarea className="input min-h-[80px]" value={form.landlord_bio}
                onChange={e => setForm(f => ({ ...f, landlord_bio: e.target.value }))}
                placeholder="e.g. Building owner. Contact via management for any issues." />
            </div>
            <button onClick={saveLandlord} disabled={busy} className="btn-primary">
              {busy ? "Saving…" : "💾 Save Landlord Profile"}
            </button>
          </div>
        </div>
      </div>

      {/* ── LANDLORD PORTAL CREDENTIALS ── */}
      <div className="card border-l-4 border-primary">
        <h2 className="text-base font-bold text-primary-dark mb-1">🔐 Landlord Portal Access</h2>
        <p className="text-sm text-slate-500 mb-3">Share these credentials with Ahmed Nady to access his read-only portal.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ["Portal URL", `${typeof window !== "undefined" ? window.location.origin : ""}/landlord`],
            ["Login URL", `${typeof window !== "undefined" ? window.location.origin : ""}/login`],
            ["Email", "landlord@yazkap.com"],
            ["Password", "landlord2024"],
          ].map(([label, val]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">{label}</p>
              <p className="font-mono text-sm font-semibold text-slate-800 break-all">{val}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">⚠️ The landlord can only view expenses, tenant payments, and their own rent payments. No profit data is visible.</p>
      </div>
    </div>
  );
}
