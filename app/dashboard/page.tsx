"use client";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import TenantDashboard from "@/components/TenantDashboard";
import SupabaseConfigNotice from "@/components/SupabaseConfigNotice";

export default function Dashboard() {
  const [role, setRole] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (!session || error) {
        router.push("/login");
        return;
      }

      setUid(session.user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }

      const r = profileData?.role ?? "tenant";
      if (r === "admin") {
        router.replace("/admin");
        return;
      }
      setRole(r);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (!isSupabaseConfigured) return <SupabaseConfigNotice />;
  if (loading) return <p className="p-10 text-center">Loading…</p>;
  return <TenantDashboard userId={uid!} />;
}
