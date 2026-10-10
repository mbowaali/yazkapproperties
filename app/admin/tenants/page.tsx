"use client";
import AdminTable, { Field } from "@/components/admin/AdminTable";

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

export default function TenantsPage() {
  return (
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
    />
  );
}