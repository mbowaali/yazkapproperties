"use client";
import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [form, setForm] = useState({ name: "Yazid Ntulume", bio: "" });
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [adminPreview, setAdminPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(({ data }) => {
      setForm({
        name: "Yazid Ntulume",
        bio: data?.admin_bio ?? "",
      });
      if (data?.admin_photo) setAdminPreview(data.admin_photo);
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
    try {
      const fd = new FormData();
      if (adminFile) fd.append("file", adminFile);
      fd.append("name", form.name);
      fd.append("bio", form.bio);
      fd.append("key_prefix", "admin");
      const res = await fetch("/api/admin/landlord-photo", { method: "POST", body: fd });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setMsg("❌ " + (json.error ?? "Failed to save"));
        setBusy(false);
        return;
      }
      // Also save admin_name / admin_bio via settings API
      const settingsRes = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_name: form.name, admin_bio: form.bio }),
      });
      if (!settingsRes.ok) {
        const json = await settingsRes.json().catch(() => ({}));
        setMsg("❌ " + (json.error ?? "Failed to save profile"));
        setBusy(false);
        return;
      }
      if (adminFile) {
        // store as admin_photo key
        const buf = await adminFile.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const dataUrl = `data:${adminFile.type};base64,${b64}`;
        const photoRes = await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_photo: dataUrl }),
        });
        if (!photoRes.ok) {
          const json = await photoRes.json().catch(() => ({}));
          setMsg("❌ " + (json.error ?? "Failed to save photo"));
          setBusy(false);
          return;
        }
      }
      setBusy(false);
      setMsg("✅ Your profile saved — tenants will see your photo and name.");
    } catch {
      setBusy(false);
      setMsg("❌ Network error. Please try again.");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">⚙️ Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage the profile tenants see for property management.</p>
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
              <input className="input" type="text" value={form.name} readOnly />
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

    </div>
  );
}
