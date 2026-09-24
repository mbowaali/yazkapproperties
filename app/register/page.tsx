"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";

export default function Register() {
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", password: "", emirates_id: "", employer: "", job_title: "",
  });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function upload(file: File, folder: string) {
    const supabase = createBrowserClient();

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    const name = `${folder}/${Date.now()}-${file.name}`;
    await supabase.storage.from("documents").upload(name, file);
    return supabase.storage.from("documents").getPublicUrl(name).data.publicUrl;
  }

  async function uploadPhoto(supabase: any, userId: string, file: File) {
    const name = `${userId}/photo.jpg`;
    await supabase.storage.from("avatars").upload(name, file, { upsert: true, contentType: file.type });
    return supabase.storage.from("avatars").getPublicUrl(name).data.publicUrl;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    
    const supabase = createBrowserClient();
    
    if (!supabase) {
      setBusy(false);
      setOk(false);
      setMsg("❌ Supabase is not configured on this deployment — set the environment variables and redeploy.");
      return;
    }
    
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.full_name } },
    });
    if (error) { setBusy(false); setOk(false); return setMsg("❌ " + error.message); }

    const idDoc = idFile ? await upload(idFile, "ids") : null;
    const contract = contractFile ? await upload(contractFile, "contracts") : null;
    const photo = photoFile ? await uploadPhoto(supabase, data.user!.id, photoFile).catch(() => null) : null;

    await supabase.from("profiles").upsert({
      id: data.user!.id, ...form,
      id_document_url: idDoc, work_contract_url: contract, photo_url: photo, role: "tenant",
    });
    setBusy(false);
    setOk(true);
    setMsg("✅ Registered! Your account is pending approval by the landlord.");
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary-dark sm:text-3xl">Tenant Registration</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Fill in your details — the landlord reviews and approves every account.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="full_name" className="label">Full Name</label>
              <input
                id="full_name"
                className="input"
                type="text"
                placeholder="Jane Smith"
                value={form.full_name}
                onChange={set("full_name")}
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="label">Phone</label>
              <input
                id="phone"
                className="input"
                type="tel"
                placeholder="+971 00 123 4567"
                value={form.phone}
                onChange={set("phone")}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.password}
              onChange={set("password")}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emirates_id" className="label">Emirates ID</label>
              <input
                id="emirates_id"
                className="input"
                type="text"
                placeholder="1234567890"
                value={form.emirates_id}
                onChange={set("emirates_id")}
              />
            </div>
            <div>
              <label htmlFor="employer" className="label">Employer</label>
              <input
                id="employer"
                className="input"
                type="text"
                placeholder="Company Name"
                value={form.employer}
                onChange={set("employer")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="job_title" className="label">Job Title</label>
            <input
              id="job_title"
              className="input"
              type="text"
              placeholder="Position"
              value={form.job_title}
              onChange={set("job_title")}
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">Profile Photo <span className="font-normal text-slate-400">(optional)</span></label>
              <input
                type="file"
                className="input file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                accept="image/*"
              />
            </div>
            <div>
              <label className="label">Emirates ID Document</label>
              <input
                type="file"
                className="input file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                accept="image/*,.pdf"
              />
            </div>
            <div>
              <label className="label">Work Contract</label>
              <input
                type="file"
                className="input file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
                accept="image/*,.pdf"
              />
            </div>
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating account…" : "Create Account"}
          </button>

          {msg && (
            <p className={`rounded-xl px-3 py-2.5 text-sm ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-danger"}`} role="status">
              {msg}
            </p>
          )}

          <p className="text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}