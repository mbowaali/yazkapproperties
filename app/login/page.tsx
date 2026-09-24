"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    
    // Get the Supabase client
    const supabase = createBrowserClient();
    
    if (!supabase) {
      setBusy(false);
      setErr("Supabase client not initialized. Please try again later.");
      return;
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="container-page flex items-center justify-center py-12 sm:py-16">
      <div className="card w-full max-w-sm !p-6 sm:!p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-2xl" aria-hidden>
            🔑
          </span>
          <h1 className="text-xl font-bold text-primary-dark">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your Yazkap Properties account</p>
        </div>

        <form onSubmit={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign In"}
          </button>
          {err && (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-danger" role="alert">
              {err}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New tenant?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}