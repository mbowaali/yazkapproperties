"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type SetupData = {
  full_name: string; email: string; phone: string | null; unit_label: string | null;
  version: number; title: string; body: string;
};

export default function CompleteProfilePage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<SetupData | null>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", nationality: "", date_of_birth: "", gender: "",
    emirates_id: "", passport_no: "", passport_expiry: "", employer: "", job_title: "",
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "",
    password: "", confirm_password: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const inviteToken = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(inviteToken);
    if (!inviteToken) { setError("This setup link is invalid or expired."); return; }
    fetch(`/api/tenant/setup?token=${encodeURIComponent(inviteToken)}`)
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "This setup link is invalid or expired.");
        return result.data as SetupData;
      })
      .then(invite => {
        setData(invite);
        setForm(current => ({ ...current, full_name: invite.full_name, email: invite.email, phone: invite.phone ?? "" }));
      })
      .catch(reason => setError(reason.message ?? "This setup link is invalid or expired."));
  }, []);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(current => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    if (!accepted) { setError("Please read and sign the current tenant rules to continue."); return; }
    setBusy(true);
    const response = await fetch("/api/tenant/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form, token, accepted, signature_name: form.full_name,
        accepted_contract_version: data?.version,
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error ?? "Could not complete setup."); return; }
    setComplete(true);
  };

  if (complete) return (
    <div className="container-page py-12">
      <section className="mx-auto max-w-xl rounded-xl border border-emerald-200 bg-white p-6 text-center shadow-card sm:p-8">
        <div className="text-4xl" aria-hidden>✓</div>
        <h1 className="mt-3 text-2xl font-bold text-primary-dark">Profile completed</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your information and agreement signature are saved. Property management will review and approve your portal access.</p>
        <Link href="/login" className="btn-primary mt-6">Go to sign in</Link>
      </section>
    </div>
  );

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase text-primary">Yazkap Properties · Tenant setup</p>
          <h1 className="mt-1 text-2xl font-bold text-primary-dark">Complete your profile</h1>
          {data?.unit_label && <p className="mt-1 text-sm text-slate-500">Unit {data.unit_label}</p>}
        </header>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

        {data && (
          <form onSubmit={submit} className="space-y-5">
            <section className="card space-y-4">
              <h2 className="font-semibold text-primary-dark">Personal information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="setup-name">Full name</label><input id="setup-name" className="input" value={form.full_name} onChange={update("full_name")} required /></div>
                <div><label className="label" htmlFor="setup-email">Email</label><input id="setup-email" className="input" type="email" value={form.email} onChange={update("email")} required /></div>
                <div><label className="label" htmlFor="setup-phone">Phone</label><input id="setup-phone" className="input" type="tel" value={form.phone} onChange={update("phone")} required /></div>
                <div><label className="label" htmlFor="setup-nationality">Nationality</label><input id="setup-nationality" className="input" value={form.nationality} onChange={update("nationality")} /></div>
                <div><label className="label" htmlFor="setup-dob">Date of birth</label><input id="setup-dob" className="input" type="date" value={form.date_of_birth} onChange={update("date_of_birth")} /></div>
                <div><label className="label" htmlFor="setup-gender">Gender</label><select id="setup-gender" className="input" value={form.gender} onChange={update("gender")}><option value="">Select</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select></div>
                <div><label className="label" htmlFor="setup-emirates">Emirates ID</label><input id="setup-emirates" className="input" value={form.emirates_id} onChange={update("emirates_id")} /></div>
                <div><label className="label" htmlFor="setup-passport">Passport number</label><input id="setup-passport" className="input" value={form.passport_no} onChange={update("passport_no")} /></div>
                <div><label className="label" htmlFor="setup-expiry">Passport expiry</label><input id="setup-expiry" className="input" type="date" value={form.passport_expiry} onChange={update("passport_expiry")} /></div>
                <div><label className="label" htmlFor="setup-employer">Employer</label><input id="setup-employer" className="input" value={form.employer} onChange={update("employer")} /></div>
                <div><label className="label" htmlFor="setup-job">Job title</label><input id="setup-job" className="input" value={form.job_title} onChange={update("job_title")} /></div>
              </div>
            </section>

            <section className="card space-y-4">
              <h2 className="font-semibold text-primary-dark">Emergency contact</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div><label className="label" htmlFor="setup-emergency-name">Name</label><input id="setup-emergency-name" className="input" value={form.emergency_contact_name} onChange={update("emergency_contact_name")} /></div>
                <div><label className="label" htmlFor="setup-emergency-phone">Phone</label><input id="setup-emergency-phone" className="input" type="tel" value={form.emergency_contact_phone} onChange={update("emergency_contact_phone")} /></div>
                <div><label className="label" htmlFor="setup-emergency-relation">Relation</label><input id="setup-emergency-relation" className="input" value={form.emergency_contact_relation} onChange={update("emergency_contact_relation")} /></div>
              </div>
            </section>

            <section className="card space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">Version {data.version}</p>
                <h2 className="mt-1 text-lg font-bold text-primary-dark">{data.title}</h2>
              </div>
              <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{data.body}</div>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input className="mt-1" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
                <span>I have read and agree to these tenant rules.</span>
              </label>
              <div><label className="label" htmlFor="setup-signature">Electronic signature</label><input id="setup-signature" className="input" value={form.full_name} readOnly /></div>
            </section>

            <section className="card space-y-4">
              <h2 className="font-semibold text-primary-dark">Create your password</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="setup-password">Password</label><input id="setup-password" className="input" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={update("password")} required /></div>
                <div><label className="label" htmlFor="setup-confirm-password">Confirm password</label><input id="setup-confirm-password" className="input" type="password" autoComplete="new-password" minLength={8} value={form.confirm_password} onChange={update("confirm_password")} required /></div>
              </div>
              <button className="btn-primary" type="submit" disabled={busy}>{busy ? "Saving profile…" : "Complete profile"}</button>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}