"use client";
import AdminTable from "@/components/admin/AdminTable";

export default function AssetsPage() {
  return (
    <AdminTable
      table="assets"
      title="🛏 Assets"
      subtitle="Furniture, appliances and equipment owned by the building"
      itemLabel="asset"
      orderBy="purchase_date"
      sumField="value"
      yearField="purchase_date"
      fields={[
        { key: "name", label: "Asset", required: true, placeholder: "e.g. Split AC 2HP" },
        { key: "category", label: "Category", type: "select", options: ["Furniture", "Appliance", "Equipment", "Plumbing", "Electrical", "Safety", "Building", "Other"], defaultValue: "Other" },
        { key: "location", label: "Location", placeholder: "Unit or common area" },
        { key: "value", label: "Value", type: "number", currency: true, step: "0.01" },
        { key: "condition", label: "Condition", type: "select", options: ["good", "fair", "poor", "broken"] },
        { key: "purchase_date", label: "Purchased", type: "date" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true },
      ]}
    />
  );
}
