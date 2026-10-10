"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

type Step = 1 | 2 | 3;
type Agreement = { version: number; title: string; body: string };

const NATIONALITIES = [
  "Emirati","Afghan","Bangladeshi","Egyptian","Ethiopian","Filipino","Ghanaian","Indian",
  "Indonesian","Jordanian","Kenyan","Lebanese","Malaysian","Moroccan","Nepali","Nigerian",
  "Pakistani","Palestinian","Rwandan","Saudi","Somali","Sri Lankan","Sudanese","Syrian",
  "Tanzanian","Ugandan","Yemeni","Other",
];

export default function Register() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", password: "", confirm_password: "",
    nationality: "", date_of_birth: "", gender: "",
    passport_no: "", passport_expiry: "", emirates_id: "",
    employer: "", job_title: "",
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "",
  });
  const [files, setFiles] = useState<Record<string, File | null>>({
    photo: null, passport: null, emirates_id_doc: null, work_contract: null, visa: null,
  });
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(true);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  useEffect(() => {
    fetch("/api/contracts/current")
      .then(r => {
        if (!r.ok) throw new Error("Could not load tenant rules");
        return r.json();
      })
      .then(({ agreement: current }) => setAgreement(current))
      .catch(() => setAgreement(null))
      .finally(() => setAgreementLoading(false));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const setFile = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFiles(prev => ({ ...prev, [key]: f }));
    if (f && f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(p => ({ ...p, [key]: ev.target?.result as string }));
      reader.readAsDataURL(f);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!form.full_name || !form.email || !form.password || !form.phone) { setMsg("Please fill all required fields."); return; }
      if (form.password !== form.confirm_password) { setMsg("Passwords do not match."); return; }
      if (form.password.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    }
    setMsg("");
    setStep(s => (s + 1) as Step);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreement) { setMsg("Tenant rules are not published yet. Please contact property management."); return; }
    if (!agreementAccepted) { setMsg("Please read and acknowledge the tenant rules to continue."); return; }
    setBusy(true); setMsg("");

    // 1. Register account
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name, phone: form.phone, email: form.email,
        password: form.password, emirates_id: form.emirates_id,
        employer: form.employer, job_title: form.job_title,
        nationality: form.nationality, date_of_birth: form.date_of_birth || null,
        gender: form.gender, passport_no: form.passport_no,
        passport_expiry: form.passport_expiry || null,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        emergency_contact_relation: form.emergency_contact_relation,
        accepted_contract_version: agreement.version,
        signature_name: form.full_name,
        accepted: agreementAccepted,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setBusy(false); setOk(false); setMsg("❌ " + json.error); return; }

    // 2. Login to get session cookie so uploads work
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password }),
    });

    // 3. Upload documents
    const docTypes = [
      { key: "photo", label: "photo" },
      { key: "passport", label: "passport" },
      { key: "emirates_id_doc", label: "emirates_id" },
      { key: "work_contract", label: "work_contract" },
      { key: "visa", label: "visa" },
    ];
    for (const { key, label } of docTypes) {
      const file = files[key];
      if (!file) continue;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", label);
      await fetch("/api/tenant/upload", { method: "POST", body: fd });
    }

    // 4. Logout (account needs admin approval before real login)
    await fetch("/api/auth/logout", { method: "POST" });

    setBusy(false); setOk(true);
    setMsg("✅ Registration complete! Your account is pending approval by property management. You will be able to sign in once approved.");
  }

  const inputCls = "input";
  const labelCls = "label";

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary-dark sm:text-3xl">Tenant Registration</h1>
          <p className="mt-1.5 text-sm text-slate-500">Complete all steps and review the current tenant rules before submitting.</p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {([1, 2, 3] as Step[]).map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                step === s ? "bg-primary text-white" : step > s ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>{step > s ? "✓" : s}</div>
              {s < 3 && <div className={`h-0.5 w-12 ${step > s ? "bg-green-500" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
        <div className="mb-6 flex justify-center gap-8 text-xs text-slate-500">
          <span className={step === 1 ? "font-semibold text-primary" : ""}>Account</span>
          <span className={step === 2 ? "font-semibold text-primary" : ""}>Personal Details</span>
          <span className={step === 3 ? "font-semibold text-primary" : ""}>Documents</span>
        </div>

        {ok ? (
          <div className="card text-center py-10">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-primary-dark">Registration Submitted!</h2>
            <p className="mt-3 text-sm text-slate-600 max-w-sm mx-auto">{msg.replace("✅ ", "")}</p>
            <Link href="/login" className="btn-primary mt-6 inline-block">Go to Login</Link>
          </div>
        ) : (
          <form onSubmit={step === 3 ? submit : (e) => { e.preventDefault(); nextStep(); }} className="space-y-5">

            {/* ── STEP 1: Account ── */}
            {step === 1 && (
              <div className="card space-y-4">
                <h2 className="font-semibold text-primary-dark">Account Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name *</label>
                    <input className={inputCls} type="text" placeholder="As on passport" value={form.full_name} onChange={set("full_name")} required />
                  </div>
                  <div>
                    <label className={labelCls}>Phone *</label>
                    <input className={inputCls} type="tel" placeholder="+971 50 000 0000" value={form.phone} onChange={set("phone")} required />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input className={inputCls} type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Password *</label>
                    <input className={inputCls} type="password" placeholder="Min 6 characters" value={form.password} onChange={set("password")} required />
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password *</label>
                    <input className={inputCls} type="password" placeholder="Repeat password" value={form.confirm_password} onChange={set("confirm_password")} required />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Personal Details ── */}
            {step === 2 && (
              <div className="card space-y-4">
                <h2 className="font-semibold text-primary-dark">Personal & Employment Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Nationality</label>
                    <select className={inputCls} value={form.nationality} onChange={set("nationality")}>
                      <option value="">Select…</option>
                      {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Gender</label>
                    <select className={inputCls} value={form.gender} onChange={set("gender")}>
                      <option value="">Select…</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Date of Birth</label>
                    <input className={inputCls} type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
                  </div>
                  <div>
                    <label className={labelCls}>Emirates ID No.</label>
                    <input className={inputCls} type="text" placeholder="784-XXXX-XXXXXXX-X" value={form.emirates_id} onChange={set("emirates_id")} />
                  </div>
                  <div>
                    <label className={labelCls}>Passport No.</label>
                    <input className={inputCls} type="text" placeholder="A12345678" value={form.passport_no} onChange={set("passport_no")} />
                  </div>
                  <div>
                    <label className={labelCls}>Passport Expiry</label>
                    <input className={inputCls} type="date" value={form.passport_expiry} onChange={set("passport_expiry")} />
                  </div>
                  <div>
                    <label className={labelCls}>Employer</label>
                    <input className={inputCls} type="text" placeholder="Company name" value={form.employer} onChange={set("employer")} />
                  </div>
                  <div>
                    <label className={labelCls}>Job Title</label>
                    <input className={inputCls} type="text" placeholder="Position" value={form.job_title} onChange={set("job_title")} />
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">🆘 Emergency Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Name</label>
                      <input className={inputCls} type="text" placeholder="Contact name" value={form.emergency_contact_name} onChange={set("emergency_contact_name")} />
                    </div>
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input className={inputCls} type="tel" placeholder="+971 50 000 0000" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} />
                    </div>
                    <div>
                      <label className={labelCls}>Relation</label>
                      <input className={inputCls} type="text" placeholder="e.g. Brother" value={form.emergency_contact_relation} onChange={set("emergency_contact_relation")} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Documents ── */}
            {step === 3 && (
              <div className="card space-y-5">
                <h2 className="font-semibold text-primary-dark">Tenant Rules, Signature & Documents</h2>
                {agreementLoading ? (
                  <p className="text-sm text-slate-500">Loading tenant rules…</p>
                ) : agreement ? (
                  <section className="space-y-3 rounded-lg border border-slate-200 p-4">
                    <div>
                      <h3 className="font-semibold text-slate-800">{agreement.title}</h3>
                      <p className="text-xs text-slate-500">Version {agreement.version}</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                      {agreement.body}
                    </div>
                    <label className="flex items-start gap-2 text-sm text-slate-700">
                      <input type="checkbox" className="mt-1" checked={agreementAccepted}
                        onChange={e => setAgreementAccepted(e.target.checked)} />
                      <span>I have read these rules and agree to acknowledge version {agreement.version}.</span>
                    </label>
                    <div>
                      <label className={labelCls}>Electronic signature</label>
                      <input className={inputCls} value={form.full_name} readOnly aria-label="Electronic signature using your registered full name" />
                      <p className="mt-1 text-xs text-slate-500">Your registered full name will be recorded as your signature.</p>
                    </div>
                  </section>
                ) : (
                  <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Tenant rules are not available yet. Registration will be enabled after property management publishes them.
                  </p>
                )}
                <p className="text-xs text-slate-500">Upload JPG, PNG or PDF — max 5MB each. All documents are optional but help speed up approval.</p>

                {/* Profile photo */}
                <div>
                  <label className={labelCls}>Profile Photo</label>
                  <div className="flex items-center gap-4">
                    {previews.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previews.photo} alt="Preview" className="h-20 w-20 rounded-2xl object-cover border border-slate-200" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-3xl">👤</div>
                    )}
                    <label className="btn-ghost cursor-pointer text-sm">
                      {files.photo ? "✅ " + files.photo.name : "Choose photo…"}
                      <input type="file" className="hidden" accept="image/*" onChange={setFile("photo")} />
                    </label>
                  </div>
                </div>

                {[
                  { key: "passport", label: "Passport Copy", accept: "image/*,.pdf", icon: "🛂" },
                  { key: "emirates_id_doc", label: "Emirates ID Copy", accept: "image/*,.pdf", icon: "🪪" },
                  { key: "work_contract", label: "Work Contract / Offer Letter", accept: "image/*,.pdf", icon: "📄" },
                  { key: "visa", label: "Visa / Residence Permit", accept: "image/*,.pdf", icon: "✈️" },
                ].map(({ key, label, accept, icon }) => (
                  <div key={key}>
                    <label className={labelCls}>{icon} {label}</label>
                    <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 hover:border-primary hover:bg-primary-50 transition">
                      <span className="text-sm text-slate-500 flex-1">
                        {files[key] ? <span className="text-green-700 font-medium">✅ {files[key]!.name}</span> : `Click to upload ${label}`}
                      </span>
                      <input type="file" className="hidden" accept={accept} onChange={setFile(key)} />
                    </label>
                    {previews[key] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previews[key]} alt="Preview" className="mt-2 h-24 rounded-xl border border-slate-200 object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {msg && !ok && (
              <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-danger" role="alert">{msg}</p>
            )}

            <div className="flex gap-3">
              {step > 1 && (
                <button type="button" onClick={() => { setMsg(""); setStep(s => (s - 1) as Step); }} className="btn-ghost flex-1">
                  ← Back
                </button>
              )}
              <button type="submit" className="btn-primary flex-1" disabled={busy || (step === 3 && (agreementLoading || !agreement || !agreementAccepted))}>
                {busy ? "Submitting…" : step < 3 ? "Next →" : "Submit Registration"}
              </button>
            </div>

            <p className="text-center text-sm text-slate-500">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
