"use client";
import { useEffect, useState } from "react";

type Agreement = { version: number; title: string; body: string; published_at: string };

const STARTER_RULES = `1. Rent and agreed charges must be paid by the due dates in the tenancy agreement.

2. Keep your room and shared areas clean, and dispose of rubbish in the designated areas.

3. Respect other residents. Avoid excessive noise, especially during night-time hours.

4. Use the property, furniture, appliances and shared facilities responsibly. Report damage or repair needs to management promptly.

5. Do not make alterations, install equipment or carry out repairs without management approval.

6. Follow building safety instructions and do not block exits, corridors or access to safety equipment.

7. Visitors must respect these rules and the privacy and safety of other residents.

8. Do not use the property for unlawful activity or create a nuisance for other residents.

These house rules supplement the tenancy agreement and do not replace its terms or any applicable law. Please review and adapt this draft to the property and applicable local requirements before publishing.`;

export default function TenantContractsPage() {
  const [versions, setVersions] = useState<Agreement[]>([]);
  const [title, setTitle] = useState("Tenant Rules & Agreement");
  const [body, setBody] = useState(STARTER_RULES);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/contracts").then(r => r.json()).then(({ versions: list }) => {
      const loaded = (list ?? []) as Agreement[];
      setVersions(loaded);
      if (loaded[0]) {
        setTitle(loaded[0].title);
        setBody(loaded[0].body);
      }
    });
  }, []);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not publish rules.");
      return;
    }
    setVersions(current => [result.agreement, ...current]);
    setMessage(`Published version ${result.agreement.version}. Tenants will be asked to acknowledge it.`);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">Tenant Rules & Agreement</h1>
        <p className="mt-1 text-sm text-slate-500">Publishing creates a new version and requests acknowledgement from every tenant.</p>
      </div>

      {message && <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700" role="status">{message}</p>}

      <form onSubmit={publish} className="card space-y-4">
        <div>
          <label className="label" htmlFor="contract-title">Title</label>
          <input id="contract-title" className="input" value={title} onChange={e => setTitle(e.target.value)} maxLength={180} required />
        </div>
        <div>
          <label className="label" htmlFor="contract-body">Rules and agreement text</label>
          <textarea id="contract-body" className="input min-h-[24rem] font-mono text-sm leading-6" value={body}
            onChange={e => setBody(e.target.value)} maxLength={40000} required />
        </div>
        <p className="text-xs text-amber-800">Have the final wording reviewed for local legal requirements. Typed-name acknowledgement is recorded in the portal; it is not a certified e-signature service.</p>
        <button className="btn-primary" type="submit" disabled={busy || !title.trim() || !body.trim()}>
          {busy ? "Publishing…" : "Publish New Version"}
        </button>
      </form>

      {versions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Published versions</h2>
          <div className="divide-y divide-slate-100 border-y border-slate-200">
            {versions.map(version => (
              <button key={version.version} type="button" onClick={() => { setTitle(version.title); setBody(version.body); }}
                className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-slate-50">
                <span className="font-medium text-slate-700">Version {version.version}: {version.title}</span>
                <time className="shrink-0 text-xs text-slate-500">{new Date(version.published_at).toLocaleDateString()}</time>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}