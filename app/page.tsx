import Link from "next/link";
import HeroSlider from "@/components/HeroSlider";

const TYPE_LABELS: Record<string, string> = {
  studio: "Studio",
  partition: "Partition",
  bedspace: "Bedspace",
  "big-hall": "Big Hall",
};

// Fetch units function
async function getVacantUnits() {
  // Dynamically import Supabase to handle server-side rendering properly
  const { createServiceRoleClient } = await import('@/lib/supabase');
  const supabase = createServiceRoleClient();
  
  if (!supabase) {
    console.error('Supabase client not initialized');
    return [];
  }
  
  const { data } = await supabase
    .from("units")
    .select("label, type, rent, currency")
    .eq("status", "vacant")
    .eq("advertised", true);
  
  return data || [];
}

export default async function Home() {
  const units = await getVacantUnits();

  return (
    <div>
      {/* Advertising slider hero */}
      <HeroSlider />

      {/* Listings */}
      <section className="container-page py-10 sm:py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-primary-dark sm:text-2xl">🟢 Available Now</h2>
            <p className="mt-1 text-sm text-slate-500">{units?.length ?? 0} unit{units?.length === 1 ? "" : "s"} ready to move in</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(units ?? []).map((u: any) => (
            <div key={u.label} className="card card-hover">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">{u.label}</h3>
                <span className="pill-paid capitalize">{TYPE_LABELS[u.type] ?? u.type.replace("-", " ")}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-primary">
                AED {u.rent?.toLocaleString()}
                <span className="text-sm font-normal text-slate-400">/mo</span>
              </p>
              <Link
                href="/register"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-dark transition hover:text-accent"
              >
                Apply now <span aria-hidden>→</span>
              </Link>
            </div>
          ))}
        </div>

        {units?.length === 0 && (
          <div className="card flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-3xl" aria-hidden>
              🏢
            </span>
            <p className="font-medium text-slate-700">No units advertised right now</p>
            <p className="max-w-sm text-sm text-slate-500">
              New rooms open up regularly — contact us on WhatsApp +971 50 512 276 to hear about upcoming vacancies.
            </p>
            <a href="https://wa.me/97150512276" target="_blank" rel="noopener noreferrer" className="btn-accent mt-1">
              💬 WhatsApp us
            </a>
          </div>
        )}
      </section>
    </div>
  );
}