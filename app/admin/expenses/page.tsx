"use client";
import AdminTable from "@/components/admin/AdminTable";

export default function ExpensesPage() {
  return (
    <AdminTable
      table="expenses"
      title="📉 Expenses"
      subtitle="Operating expenses (Excel import) — landlord rent is tracked separately under Landlord"
      itemLabel="expense"
      orderBy="date"
      sumField="amount"
      yearField="date"
      note={<>📌 Landlord rent payments belong on the <strong>🔑 Landlord</strong> page, not here, so profit is calculated correctly.</>}
      fields={[
        { key: "date", label: "Date", type: "date", defaultValue: "today" },
        { key: "year", label: "Year", type: "number", hideInTable: true },
        { key: "month", label: "Month", type: "select", options: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], hideInTable: true },
        { key: "category", label: "Category", type: "select", options: ["Utilities", "Electricity", "Water", "Internet", "Cleaning", "Security", "Repairs", "Maintenance", "Supplies", "Equipment", "Legal", "Government Fees", "Transport", "Staff", "Other"], defaultValue: "Other" },
        { key: "description", label: "Description", placeholder: "What was purchased / done" },
        { key: "amount", label: "Amount", type: "number", currency: true, required: true, step: "0.01" },
        { key: "method", label: "Method", type: "select", options: ["Cash", "Bank Transfer", "Cheque", "Credit Card", "Card", "Online"] },
        { key: "receipt_no", label: "Receipt No" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true },
      ]}
    />
  );
}
