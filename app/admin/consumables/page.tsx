"use client";
import AdminTable from "@/components/admin/AdminTable";

export default function ConsumablesPage() {
  return (
    <AdminTable
      table="consumables"
      title="🧴 Consumables"
      subtitle="Recurring supplies stock — cleaning, electrical, office and safety items"
      itemLabel="item"
      orderBy="last_restock"
      yearField="last_restock"
      fields={[
        { key: "item", label: "Item", required: true, placeholder: "e.g. Floor cleaner 5L" },
        { key: "category", label: "Category", type: "select", options: ["Cleaning", "Electrical", "Plumbing", "Office", "Stationery", "Safety", "Other"], defaultValue: "Other" },
        { key: "quantity", label: "Qty", type: "number", step: "1", defaultValue: 0 },
        { key: "unit", label: "Unit", type: "select", options: ["pcs", "box", "roll", "litre", "kg", "pack"], defaultValue: "pcs" },
        { key: "unit_cost", label: "Unit cost", type: "number", currency: true, step: "0.01" },
        { key: "last_restock", label: "Last restock", type: "date" },
        { key: "supplier", label: "Supplier", placeholder: "Store / vendor name" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true },
      ]}
    />
  );
}
