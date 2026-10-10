"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TenantDashboard from "@/components/TenantDashboard";

export default function Dashboard() {
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(({ user }) => {
      if (!user) { router.push("/login"); return; }
      if (user.role === "admin") { router.replace("/admin"); return; }
      setUserId(user.id);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <p className="p-10 text-center">Loading…</p>;
  return <TenantDashboard userId={userId!} />;
}
