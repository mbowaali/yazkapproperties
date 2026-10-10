"use client";
import Link from "next/link";
import AdminTable, { Field, downloadReceipt } from "@/components/admin/AdminTable";

const fields: Field[] = [
  { key: "invoice_no", label: "Invoice #", required: true, placeholder: "INV-2026-001" },
  { key: "total", label: "Total", type: "number", currency: true, required: true, step: "0.01" },
  { key: "due_date", label: "Due date", type: "date" },
  { key: "status", label: "Status", type: "select", options: ["pending", "paid", "overdue"], defaultValue: "pending" },
  { key: "pdf_url", label: "PDF link", type: "text", placeholder: "https://…", hideInTable: true },
];

const filterFields: Field[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["paid", "pending", "overdue"],
  },
];

export default function InvoicesPage() {
  // Trigger Vercel rebuild with dependencies fix
  return (
    <AdminTable
      table="invoices"
      title="🧾 Invoices"
      subtitle="Outstanding and paid invoices — unpaid ones feed the Overview “Outstanding” card. PDF opens a printable invoice."
      itemLabel="invoice"
      orderBy="due_date"
      sumField="total"
      yearField="due_date"
      filterFields={filterFields}
      extraRowAction={(row) => (
        <>
          <Link
            href={`/admin/invoices/${row.id}`}
            className="mr-1.5 text-sm font-semibold text-primary hover:underline"
          >
            PDF
          </Link>
          {row.status === 'paid' && (
            <button
              onClick={() => downloadReceipt(row.id)}
              className="text-sm font-semibold text-green-600 hover:underline"
            >
              Receipt
            </button>
          )}
        </>
      )}
      fields={fields}
    />
  );
}