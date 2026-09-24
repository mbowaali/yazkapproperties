"use client";
import AdminTable from "@/components/admin/AdminTable";

export default function UnitsPage() {
  return (
    <AdminTable
      table="units"
      title="🏢 Units"
      subtitle="Vacancy board — units that are vacant AND advertised appear on the public homepage"
      itemLabel="unit"
      orderBy="label"
      orderAsc
      sumField="rent"
      note={
        <>📌 To list a unit publicly on the homepage, set its <strong>Status = vacant</strong> and tick <strong>Advertised</strong>. Occupied or non-advertised units stay private.</>
      }
      fields={[
        { key: "label", label: "Unit", required: true, placeholder: "e.g. Studio 2F-03" },
        { key: "type", label: "Type", type: "select", options: ["studio", "partition", "bedspace", "big-hall", "shop", "office", "other"] },
        { key: "rent", label: "Rent /mo", type: "number", currency: true, step: "0.01", placeholder: "2500" },
        { key: "currency", label: "Currency", type: "select", options: ["AED", "USD", "UGX"], defaultValue: "AED" },
        { key: "status", label: "Status", type: "select", options: ["vacant", "occupied", "maintenance"], defaultValue: "vacant" },
        { key: "advertised", label: "Advertised on site", type: "checkbox" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
