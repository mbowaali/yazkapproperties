"use client";
import AdminTable from "@/components/admin/AdminTable";

export default function DepositsPage() {
  return (
    <AdminTable
      table="deposits"
      title="💰 Deposits"
      subtitle="Security deposits held from tenants — track refunds and forfeitures"
      itemLabel="deposit"
      orderBy="held_since"
      sumField="amount"
      yearField="held_since"
      fields={[
        { key: "tenant_name", label: "Tenant", required: true },
        { key: "unit_label", label: "Unit", placeholder: "Studio 2F-03" },
        { key: "amount", label: "Amount", type: "number", currency: true, required: true, step: "0.01" },
        { key: "status", label: "Status", type: "select", options: ["held", "partially-refunded", "refunded", "forfeited"], defaultValue: "held" },
        { key: "held_since", label: "Held since", type: "date", defaultValue: "today" },
        { key: "refund_date", label: "Refunded on", type: "date" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true },
      ]}
    />
  );
}
