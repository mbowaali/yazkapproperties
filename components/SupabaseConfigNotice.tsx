export default function SupabaseConfigNotice() {
  return (
    <div className="container-page flex items-center justify-center py-16">
      <div className="card w-full max-w-xl border-amber-200 !p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl" aria-hidden>⚙️</span>
          <h1 className="text-lg font-bold text-primary-dark">Almost there — Supabase isn&apos;t connected yet</h1>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          This deployment is missing its Supabase environment variables, so sign-in and
          data pages are switched off. The site owner can switch them on in about a minute:
        </p>
        <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-slate-700">
          <li>
            Open your hosting dashboard (e.g. Vercel → <strong>Project → Settings → Environment Variables</strong>).
          </li>
          <li>
            Add these three variables — the values are in your project&apos;s <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local</code> file
            (or Supabase → Settings → API):
            <div className="mt-1.5 space-y-1 font-mono text-xs text-slate-600">
              <p>NEXT_PUBLIC_SUPABASE_URL</p>
              <p>NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
              <p>SUPABASE_SERVICE_ROLE_KEY</p>
            </div>
          </li>
          <li>
            <strong>Redeploy</strong> the project (Deployments → latest → ⋯ → Redeploy). These values are
            baked into the app at build time, so a redeploy is required.
          </li>
        </ol>
        <p className="mt-4 text-xs text-slate-400">
          The public site (vacancies, photos, contact) keeps working while this is pending.
        </p>
      </div>
    </div>
  );
}
