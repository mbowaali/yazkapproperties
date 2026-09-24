"use client";
import AdminTable from "@/components/admin/AdminTable";

export default function TransactionsPage() {
  return (
    <AdminTable
      table="transactions"
      title="💵 Transactions"
      subtitle="Rent payment history (Excel import 2022–2026) plus payments recorded here"
      itemLabel="transaction"
      orderBy="date"
      sumField="amount"
      yearField="date"
      fields={[
        { key: "date", label: "Date", type: "date", required: true, defaultValue: "today" },
        { key: "tenant_name", label: "Tenant", required: true },
        { key: "amount", label: "Amount", type: "number", currency: true, required: true, step: "0.01", placeholder: "2500" },
        { key: "currency", label: "Cur.", type: "select", options: ["AED", "USD", "UGX"], defaultValue: "AED", hideInTable: true },
        { key: "type", label: "Type", type: "select", options: ["rent", "deposit", "refund", "other"], defaultValue: "rent" },
        { key: "method", label: "Method", type: "select", options: ["Cash", "Cheque", "Bank Transfer", "Card", "Online"] },
        { key: "status", label: "Status", type: "select", options: ["Paid", "Pending", "Overdue"], defaultValue: "Paid" },
        { key: "note", label: "Note", type: "textarea", hideInTable: true },
      ]}
    />
  );
}
