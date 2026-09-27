"use client";
import Link from "next/link";
import AdminTable from "@/components/admin/AdminTable";

export default function InvoicesPage() {
  return (
    <AdminTable
      table="invoices"
      title="🧾 Invoices"
      subtitle="Outstanding and paid invoices — unpaid ones feed the Overview “Outstanding” card. PDF opens a printable invoice."
      itemLabel="invoice"
      orderBy="due_date"
      sumField="total"
      yearField="due_date"
      extraRowAction={(row) => (
        <Link
          href={`/admin/invoices/${row.id}`}
          className="mr-1.5 text-sm font-semibold text-primary hover:underline"
        >
          PDF
        </Link>
      )}
      fields={[
        { key: "invoice_no", label: "Invoice #", required: true, placeholder: "INV-2026-001" },
        { key: "total", label: "Total", type: "number", currency: true, required: true, step: "0.01" },
        { key: "due_date", label: "Due date", type: "date" },
        { key: "status", label: "Status", type: "select", options: ["pending", "paid", "overdue"], defaultValue: "pending" },
        { key: "pdf_url", label: "PDF link", type: "text", placeholder: "https://…", hideInTable: true },
      ]}
    />
  );
}
