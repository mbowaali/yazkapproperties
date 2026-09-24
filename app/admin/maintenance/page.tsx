"use client";
import AdminTable from "@/components/admin/AdminTable";

export default function MaintenancePage() {
  return (
    <AdminTable
      table="maintenance_requests"
      title="🛠 Maintenance"
      subtitle="Repair jobs for the building — open items appear on the Overview"
      itemLabel="job"
      orderBy="reported_date"
      sumField="cost"
      yearField="reported_date"
      fields={[
        { key: "issue", label: "Issue", type: "text", required: true, placeholder: "e.g. AC leaking in Studio 2F-03" },
        { key: "unit_label", label: "Unit", placeholder: "Studio 2F-03" },
        { key: "tenant_name", label: "Reported by", placeholder: "Tenant name" },
        { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "urgent"], defaultValue: "medium" },
        { key: "status", label: "Status", type: "select", options: ["open", "in-progress", "done"], defaultValue: "open" },
        { key: "cost", label: "Cost", type: "number", currency: true, step: "0.01" },
        { key: "reported_date", label: "Reported", type: "date", defaultValue: "today" },
        { key: "resolved_date", label: "Resolved", type: "date" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true },
      ]}
    />
  );
}
