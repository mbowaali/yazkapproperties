"use client";
import { useState } from "react";
import AdminTable, { Field, BulkAction } from "@/components/admin/AdminTable";
import BulkInviteModal from "@/components/admin/BulkInviteModal";

const fields: Field[] = [
  { key: "photo_url", label: "Photo", type: "photo" },
  { key: "code", label: "Code", required: true, placeholder: "e.g. T-001" },
  { key: "full_name", label: "Full name", required: true },
  { key: "phone", label: "Phone", placeholder: "+971…" },
  { key: "email", label: "Email", type: "text", placeholder: "name@email.com" },
  { key: "emergency_contact", label: "Emergency contact", hideInTable: true },
  { key: "entry_date", label: "Entry date", type: "date" },
  { key: "monthly_rent", label: "Monthly rent", type: "number", currency: true, step: "0.01" },
  { key: "status", label: "Status", type: "select", options: ["active", "exited"], defaultValue: "active" },
  { key: "space_type", label: "Space type", type: "select", options: ["studio", "partition", "bedspace", "big-hall", "shop", "office", "other"] },
];

const filterFields: Field[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["active", "exited"],
  },
];

const bulkActions: BulkAction[] = [
  {
    id: "bulk-invite",
    label: "📨 Send Account Invites",
    description: "Invite selected tenants to set up their accounts",
  },
];

export default function TenantsPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);

  const handleBulkAction = (actionId: string, selectedIds: number[]) => {
    if (actionId === "bulk-invite") {
      setSelectedTenants(selectedIds);
      setShowInviteModal(true);
    }
  };

  return (
    <>
      <AdminTable
        table="tenants"
        title="👥 Tenants"
        subtitle="Roster imported from the Excel master + tenants added here"
        itemLabel="tenant"
        orderBy="full_name"
        orderAsc
        sumField="monthly_rent"
        fields={fields}
        filterFields={filterFields}
        bulkActions={bulkActions}
        onBulkAction={handleBulkAction}
      />
      
      {showInviteModal && (
        <BulkInviteModal
          tenantIds={selectedTenants}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
}