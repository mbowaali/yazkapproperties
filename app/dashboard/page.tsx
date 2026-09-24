"use client";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import AdminDashboard from "@/components/AdminDashboard";
import TenantDashboard from "@/components/TenantDashboard";

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
      setRole(profileData?.role ?? "tenant");
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

  if (loading) return <p className="p-10 text-center">Loading…</p>;
  return role === "admin" ? <AdminDashboard /> : <TenantDashboard userId={uid!} />;
}