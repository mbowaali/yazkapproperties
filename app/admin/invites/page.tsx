"use client";
import { useEffect, useState } from "react";
import AdminTable, { Field } from "@/components/admin/AdminTable";

interface Invite {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  expires_at: string;
  completed_at: string | null;
  created_at: string;
  created_by_name: string;
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, expired: 0, completed: 0 });

  useEffect(() => {
    const loadInvites = async () => {
      try {
        const response = await fetch("/api/admin/tenants/invites/status");
        const data = await response.json();
        if (response.ok) {
          setInvites(data.invites);
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to load invites:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInvites();
  }, []);

  const fields: Field[] = [
    { key: "id", label: "ID", required: true },
    { key: "full_name", label: "Tenant", required: true },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { 
      key: "status", 
      label: "Status", 
      type: "select", 
      options: ["pending", "completed", "expired"],
      required: true 
    },
    { key: "created_at", label: "Created", type: "date" },
    { key: "expires_at", label: "Expires", type: "date" },
    { key: "completed_at", label: "Completed", type: "date" },
    { key: "created_by_name", label: "Sent By" },
  ];

  const filterFields: Field[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["pending", "completed", "expired"],
    },
  ];

  if (loading) {
    return <div className="p-8 text-center">Loading invites...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
          <p className="text-sm text-blue-600">Total Invites</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
          <p className="text-sm text-amber-600">Pending</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
          <p className="text-sm text-green-600">Completed</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-2xl font-bold text-red-700">{stats.expired}</p>
          <p className="text-sm text-red-600">Expired</p>
        </div>
      </div>

      <AdminTable
        table="tenant_setup_invites"
        title="📨 Tenant Account Invites"
        subtitle="Track all tenant account setup invitations"
        itemLabel="invite"
        orderBy="created_at"
        orderAsc={false}
        fields={fields}
        filterFields={filterFields}
      />
    </div>
  );
}