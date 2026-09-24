"use client";
import AdminTable from "@/components/admin/AdminTable";

export default function LandlordPage() {
  return (
    <AdminTable
      table="landlord_payments"
      title="🔑 Landlord — Ahmed Nady"
      subtitle="Rent paid to the building landlord (contract: AED 5,800 / month)"
      itemLabel="payment"
      orderBy="date"
      sumField="amount"
      yearField="date"
      note={<>📌 Contract rate: <strong>AED 5,800 / month</strong> (AED 69,600 / year) to Ahmed Nady. These payments reduce net profit on the Overview and Reports pages.</>}
      fields={[
        { key: "date", label: "Paid on", type: "date", required: true, defaultValue: "today" },
        { key: "amount", label: "Amount", type: "number", currency: true, required: true, step: "0.01", defaultValue: 5800 },
        { key: "method", label: "Method", type: "select", options: ["Cash", "Bank Transfer", "Cheque"], defaultValue: "Cash" },
        { key: "note", label: "Note", type: "text", placeholder: "e.g. January 2026 rent" },
      ]}
    />
  );
}
