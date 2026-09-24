"use client";
import AdminTable from "@/components/admin/AdminTable";

export default function BanksPage() {
  return (
    <AdminTable
      table="bank_accounts"
      title="🏦 Banks / Branches"
      subtitle="Directory of bank accounts used for collecting rent and paying bills"
      itemLabel="account"
      orderBy="bank_name"
      orderAsc
      note={<>🔒 This page is visible to the owner (admin) only — RLS blocks everyone else from reading the table.</>}
      fields={[
        { key: "bank_name", label: "Bank", required: true, placeholder: "e.g. ADCB" },
        { key: "branch", label: "Branch", placeholder: "e.g. Electra Street" },
        { key: "account_name", label: "Account name", placeholder: "Yazkap Investment" },
        { key: "iban", label: "IBAN / Account no.", placeholder: "AE…", hideInTable: true },
        { key: "currency", label: "Currency", type: "select", options: ["AED", "USD", "UGX"], defaultValue: "AED" },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true },
      ]}
    />
  );
}
